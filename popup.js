const statusEl = document.getElementById("status");
const analysierenBtn = document.getElementById("analysieren");
const entfernenBtn = document.getElementById("entfernen");
const mitKiEl = document.getElementById("mitKi");
const kiOptionHinweis = document.getElementById("kiOptionHinweis");

// Checkbox-Zustand herstellen: ohne Key ausgegraut, mit Key wählbar
// (Auswahl wird gespeichert, Standard ist "mit KI").
chrome.storage.local.get(["apiKey", "useKi"]).then(({ apiKey, useKi }) => {
  if (!apiKey) {
    mitKiEl.checked = false;
    mitKiEl.disabled = true;
    kiOptionHinweis.textContent = "(kein API-Key hinterlegt)";
  } else {
    mitKiEl.checked = useKi !== false;
    mitKiEl.disabled = false;
  }
});

mitKiEl.addEventListener("change", () => {
  chrome.storage.local.set({ useKi: mitKiEl.checked });
});

// Legende aus der gemeinsamen Stufen-Definition aufbauen
const legendeEl = document.getElementById("legende");
for (const stufe of AMPEL_STUFEN) {
  const zeile = document.createElement("div");
  const punkt = document.createElement("span");
  punkt.className = "punkt";
  punkt.style.background = stufe.punkt;
  zeile.append(punkt, stufe.label);
  legendeEl.appendChild(zeile);
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "fehler" : "";
}

// Aktiven Tab einmal ermitteln und das Content Script einmal injizieren;
// beide Klick-Handler und der Markierungs-Check teilen sich das Ergebnis.
let tabPromise = null;
function tabBereit() {
  if (!tabPromise) {
    tabPromise = (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^(https?|file):/.test(tab.url || "")) {
        throw new Error("Diese Seite kann nicht analysiert werden.");
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["ampel.js", "content.js"]
      });
      return tab;
    })();
  }
  return tabPromise;
}

async function sendToTab(cmd) {
  const tab = await tabBereit();
  return chrome.tabs.sendMessage(tab.id, { cmd });
}

const MODUS_TEXT = {
  ki: "Analyse: Claude API",
  lokal: "Analyse: lokale Muster-Erkennung",
  "lokal-fallback": "Analyse: lokale Muster-Erkennung (API-Fehler)"
};

function ergebnisText(result) {
  const bereich = result.scope === "selection" ? " im markierten Bereich" : "";
  let kopf;
  if (result.gesamt > result.total) {
    // Obergrenze von content.js erreicht: nicht so tun, als wäre alles bewertet
    kopf = `${result.total} von ${result.gesamt} Abschnitten${bereich} bewertet (Obergrenze erreicht):`;
  } else {
    const wort = result.total === 1 ? "Abschnitt" : "Abschnitte";
    kopf = `${result.total} ${wort}${bereich} bewertet:`;
  }
  const zaehlung = AMPEL_STUFEN.map((s) => `${s.kurz}: ${result.counts[s.id]}`).join(", ");
  let text = `${kopf}\n${zaehlung}\n` + (MODUS_TEXT[result.mode] || "");
  if (result.apiError) {
    text += `\n(${result.apiError})`;
  }
  return text;
}

// Beim Öffnen prüfen, ob auf der Seite etwas markiert ist (Button-
// Beschriftung) und ob es schon ein Analyse-Ergebnis gibt (Statistik
// wieder anzeigen, die Markierungen stehen ja noch auf der Seite).
sendToTab("getStatus")
  .then((status) => {
    if (status?.hasSelection) {
      analysierenBtn.textContent = "Markierten Text analysieren";
    }
    if (status?.lastResult) {
      setStatus(ergebnisText(status.lastResult), Boolean(status.lastResult.apiError));
    }
  })
  .catch(() => {
    // z. B. chrome://-Seiten: Standardbeschriftung bleibt stehen.
  });

analysierenBtn.addEventListener("click", async () => {
  analysierenBtn.disabled = true;
  setStatus("Analysiere … das kann je nach Textmenge etwas dauern.");

  try {
    const result = await sendToTab("analyze");
    if (!result?.ok) {
      setStatus(result?.error || "Unbekannter Fehler", true);
    } else {
      setStatus(ergebnisText(result), Boolean(result.apiError));
    }
  } catch (err) {
    setStatus(String(err.message || err), true);
  } finally {
    analysierenBtn.disabled = false;
  }
});

entfernenBtn.addEventListener("click", async () => {
  try {
    await sendToTab("clear");
    setStatus("Markierungen entfernt.");
  } catch (err) {
    setStatus(String(err.message || err), true);
  }
});

// Eigenen Text prüfen: eingefügter Text geht direkt an den Service Worker,
// ohne Umweg über die Seite. Gleiche Regeln wie bei der Seitenanalyse
// (Mindestlänge, Kappung), gleiche Modus-Wahl (lokal oder Claude).
const MIN_CHARS = 150;
const MAX_TEXT_SEGMENTS = 40;
const MAX_CHARS_PER_SEGMENT = 2000;

const textPruefenBtn = document.getElementById("textPruefen");
const textBereich = document.getElementById("textBereich");
const eigenerTextEl = document.getElementById("eigenerText");
const textAnalysierenBtn = document.getElementById("textAnalysieren");
const textErgebnisEl = document.getElementById("textErgebnis");

textPruefenBtn.addEventListener("click", () => {
  textBereich.hidden = !textBereich.hidden;
  if (!textBereich.hidden) eigenerTextEl.focus();
});

// Absätze ab MIN_CHARS einzeln bewerten; besteht der Text nur aus kürzeren
// Absätzen, wird er als Ganzes bewertet, sofern er insgesamt lang genug ist.
function textSegmente(roh) {
  const bloecke = roh
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  let lange = bloecke.filter((t) => t.length >= MIN_CHARS);
  if (lange.length === 0 && roh.trim().length >= MIN_CHARS) {
    lange = [roh.trim()];
  }
  return lange
    .slice(0, MAX_TEXT_SEGMENTS)
    .map((t, i) => ({ id: i, text: t.slice(0, MAX_CHARS_PER_SEGMENT) }));
}

const STUFEN_MAP = Object.fromEntries(AMPEL_STUFEN.map((s) => [s.id, s]));

textAnalysierenBtn.addEventListener("click", async () => {
  const segments = textSegmente(eigenerTextEl.value);
  textErgebnisEl.textContent = "";
  if (segments.length === 0) {
    const hinweis = document.createElement("div");
    hinweis.className = "fehler";
    hinweis.textContent = `Der Text ist zu kurz für eine Bewertung (mindestens ${MIN_CHARS} Zeichen).`;
    textErgebnisEl.appendChild(hinweis);
    return;
  }

  textAnalysierenBtn.disabled = true;
  textErgebnisEl.textContent = "Prüfe …";
  try {
    const result = await chrome.runtime.sendMessage({ cmd: "classify", segments });
    textErgebnisEl.textContent = "";
    if (!result?.ok) {
      throw new Error(result?.error || "Unbekannter Fehler");
    }
    for (const rating of result.ratings) {
      const stufe = STUFEN_MAP[rating.stufe];
      if (!stufe) continue;
      const eintrag = document.createElement("div");
      eintrag.className = "textTreffer";
      eintrag.style.background = stufe.bg;
      const kopf = document.createElement("strong");
      kopf.textContent = stufe.label;
      eintrag.appendChild(kopf);
      if (segments.length > 1) {
        const ausschnitt = document.createElement("div");
        ausschnitt.className = "ausschnitt";
        const text = segments[rating.id]?.text || "";
        ausschnitt.textContent = `„${text.slice(0, 70)}${text.length > 70 ? " …" : ""}"`;
        eintrag.appendChild(ausschnitt);
      }
      const grund = document.createElement("div");
      grund.className = "grund";
      grund.textContent = rating.grund;
      eintrag.appendChild(grund);
      textErgebnisEl.appendChild(eintrag);
    }
    const modus = document.createElement("div");
    modus.className = result.apiError ? "fehler" : "";
    modus.textContent =
      (MODUS_TEXT[result.mode] || "") +
      (result.apiError ? `\n(${result.apiError})` : "");
    textErgebnisEl.appendChild(modus);
  } catch (err) {
    const fehler = document.createElement("div");
    fehler.className = "fehler";
    fehler.textContent = String(err.message || err);
    textErgebnisEl.appendChild(fehler);
  } finally {
    textAnalysierenBtn.disabled = false;
  }
});

document.getElementById("einstellungen").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
