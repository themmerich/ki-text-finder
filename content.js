// Content Script: sammelt Textabschnitte, lässt sie im Service Worker
// klassifizieren und färbt sie als Ampel ein.

(() => {
  if (window.__kiAmpelLoaded) return;
  window.__kiAmpelLoaded = true;

  const MIN_CHARS = 150; // kürzere Abschnitte sind stilistisch kaum beurteilbar
  const MAX_SEGMENTS = 120;
  const MAX_CHARS_PER_SEGMENT = 2000; // pro Abschnitt wird höchstens so viel Text analysiert

  const COLORS = {
    rot: { bg: "rgba(220, 53, 69, 0.28)", label: "höchstwahrscheinlich KI-generiert" },
    gelb: { bg: "rgba(255, 193, 7, 0.30)", label: "wahrscheinlich KI-generiert" },
    gruen: { bg: "rgba(25, 135, 84, 0.16)", label: "vermutlich nicht KI-generiert" }
  };

  function isVisible(el) {
    if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return false;
    const style = getComputedStyle(el);
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
    let candidates = Array.from(
      document.querySelectorAll("p, li, blockquote, dd, figcaption")
    ).filter((el) => {
      const text = el.innerText?.trim() || "";
      return text.length >= MIN_CHARS && isVisible(el);
    });

    if (ranges.length > 0) {
      candidates = candidates.filter((el) =>
        ranges.some((range) => range.intersectsNode(el))
      );
    }

    // Verschachtelte Kandidaten (z. B. p in li) nur einmal werten: innersten behalten
    const innermost = candidates.filter(
      (el) => !candidates.some((other) => other !== el && el.contains(other))
    );

    return innermost.slice(0, MAX_SEGMENTS).map((el, i) => {
      el.dataset.kiAmpelId = String(i);
      return { id: i, text: el.innerText.trim().slice(0, MAX_CHARS_PER_SEGMENT) };
    });
  }

  function applyRatings(ratings) {
    let counts = { rot: 0, gelb: 0, gruen: 0 };
    for (const rating of ratings) {
      const el = document.querySelector(`[data-ki-ampel-id="${rating.id}"]`);
      const color = COLORS[rating.stufe];
      if (!el || !color) continue;
      if (!el.dataset.kiAmpelOrigBg) {
        el.dataset.kiAmpelOrigBg = el.style.backgroundColor || "__leer__";
        el.dataset.kiAmpelOrigTitle = el.title || "__leer__";
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
      if (el.dataset.kiAmpelOrigBg !== undefined) {
        el.style.backgroundColor =
          el.dataset.kiAmpelOrigBg === "__leer__" ? "" : el.dataset.kiAmpelOrigBg;
        el.title =
          el.dataset.kiAmpelOrigTitle === "__leer__" ? "" : el.dataset.kiAmpelOrigTitle;
      }
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
