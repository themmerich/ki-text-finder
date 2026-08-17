// Content Script: sammelt Textabschnitte, lässt sie im Service Worker
// klassifizieren und färbt sie als Ampel ein. Wird zusammen mit ampel.js
// injiziert (siehe popup.js).

(() => {
  if (window.__kiAmpelLoaded) return;
  window.__kiAmpelLoaded = true;

  const MIN_CHARS = 150; // kürzere Abschnitte sind stilistisch kaum beurteilbar
  const MAX_SEGMENTS = 120;
  const MAX_CHARS_PER_SEGMENT = 2000; // pro Abschnitt wird höchstens so viel Text analysiert

  const COLORS = Object.fromEntries(AMPEL_STUFEN.map((s) => [s.id, s]));

  // Die Elemente des letzten Laufs, Index = Segment-id.
  let segmentEls = [];

  function isVisible(el) {
    const style = getComputedStyle(el);
    if (!el.offsetParent && style.position !== "fixed") return false;
    return style.visibility !== "hidden" && style.display !== "none";
  }

  // Markierter Text: die Auswahl entscheidet, welche Blöcke analysiert werden.
  // Bewertet und eingefärbt wird weiterhin der ganze Block, damit die Seite
  // nicht umgebaut werden muss.
  function selectionRanges() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
    if (!sel.toString().trim()) return [];
    const ranges = [];
    for (let i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i));
    return ranges;
  }

  function collectSegments(ranges) {
    // innerText erzwingt Layout und ist damit der teuerste Zugriff hier –
    // deshalb nur einmal pro Element lesen. Geschrieben wird erst in
    // applyRatings, wenn alle Lesezugriffe vorbei sind.
    let kandidaten = Array.from(
      document.querySelectorAll("p, li, blockquote, dd, figcaption")
    )
      .map((el) => ({ el, text: el.innerText.trim() }))
      .filter(({ el, text }) => text.length >= MIN_CHARS && isVisible(el));

    if (ranges.length > 0) {
      kandidaten = kandidaten.filter(({ el }) =>
        ranges.some((range) => range.intersectsNode(el))
      );
    }

    // Verschachtelte Kandidaten (z. B. p in li) nur einmal werten: innersten
    // behalten. Über die Elternkette statt paarweise contains(), damit der
    // Aufwand linear mit der Kandidatenzahl wächst.
    const kandidatenSet = new Set(kandidaten.map((k) => k.el));
    const hatKandidatenNachfahren = new Set();
    for (const { el } of kandidaten) {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (kandidatenSet.has(p)) hatKandidatenNachfahren.add(p);
      }
    }

    const segmente = kandidaten
      .filter(({ el }) => !hatKandidatenNachfahren.has(el))
      .slice(0, MAX_SEGMENTS);
    segmentEls = segmente.map(({ el }) => el);
    return segmente.map(({ text }, i) => ({
      id: i,
      text: text.slice(0, MAX_CHARS_PER_SEGMENT)
    }));
  }

  function applyRatings(ratings) {
    const counts = Object.fromEntries(AMPEL_STUFEN.map((s) => [s.id, 0]));
    for (const rating of ratings) {
      const el = segmentEls[rating.id];
      const color = COLORS[rating.stufe];
      if (!el || !color) continue;
      if (!("kiAmpelOrigBg" in el.dataset)) {
        el.dataset.kiAmpelId = String(rating.id); // Marker für clearHighlights
        el.dataset.kiAmpelOrigBg = el.style.backgroundColor;
        el.dataset.kiAmpelOrigTitle = el.title;
      }
      el.style.backgroundColor = color.bg;
      el.style.transition = "background-color 0.3s";
      el.title = `KI-Text-Finder: ${color.label}\n${rating.grund}`;
      counts[rating.stufe]++;
    }
    return counts;
  }

  function clearHighlights() {
    for (const el of document.querySelectorAll("[data-ki-ampel-id]")) {
      el.style.backgroundColor = el.dataset.kiAmpelOrigBg || "";
      el.title = el.dataset.kiAmpelOrigTitle || "";
      delete el.dataset.kiAmpelId;
      delete el.dataset.kiAmpelOrigBg;
      delete el.dataset.kiAmpelOrigTitle;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.cmd === "clear") {
      clearHighlights();
      sendResponse({ ok: true });
      return false;
    }
    // Das Popup fragt beim Öffnen, ob etwas markiert ist, und beschriftet
    // seinen Button entsprechend.
    if (message?.cmd === "hasSelection") {
      sendResponse({ ok: true, hasSelection: selectionRanges().length > 0 });
      return false;
    }
    if (message?.cmd !== "analyze") return false;

    const ranges = selectionRanges(); // vor dem Aufräumen lesen
    const scope = ranges.length > 0 ? "selection" : "page";

    clearHighlights();
    const segments = collectSegments(ranges);
    if (segments.length === 0) {
      sendResponse({
        ok: false,
        error:
          scope === "selection"
            ? `Der markierte Text ist zu kurz für eine Bewertung (mindestens ${MIN_CHARS} Zeichen).`
            : "Keine ausreichend langen Textabschnitte auf dieser Seite gefunden."
      });
      return false;
    }

    chrome.runtime.sendMessage({ cmd: "classify", segments }, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      if (!result?.ok) {
        sendResponse({ ok: false, error: result?.error || "Unbekannter Fehler" });
        return;
      }
      const counts = applyRatings(result.ratings);
      sendResponse({
        ok: true,
        counts,
        total: segments.length,
        scope,
        mode: result.mode,
        apiError: result.apiError
      });
    });
    return true; // asynchrone Antwort
  });
})();
