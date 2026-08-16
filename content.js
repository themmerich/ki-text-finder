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

  function collectSegments() {
    const candidates = Array.from(
      document.querySelectorAll("p, li, blockquote, dd, figcaption")
    ).filter((el) => {
      const text = el.innerText?.trim() || "";
      return text.length >= MIN_CHARS && isVisible(el);
    });

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
    if (message?.cmd !== "analyze") return false;

    clearHighlights();
    const segments = collectSegments();
    if (segments.length === 0) {
      sendResponse({
        ok: false,
        error: "Keine ausreichend langen Textabschnitte auf dieser Seite gefunden."
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
        mode: result.mode,
        apiError: result.apiError
      });
    });
    return true; // asynchrone Antwort
  });
})();
