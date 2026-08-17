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

// Beim Öffnen prüfen, ob auf der Seite etwas markiert ist: dann analysiert
// der Klick nur die markierten Abschnitte, und der Button sagt das auch.
sendToTab("hasSelection")
  .then((result) => {
    if (result?.hasSelection) {
      analysierenBtn.textContent = "Markierten Text analysieren";
    }
  })
  .catch(() => {
    // z. B. chrome://-Seiten: Standardbeschriftung bleibt stehen.
  });

const MODUS_TEXT = {
  ki: "Analyse: Claude API",
  lokal: "Analyse: lokale Muster-Erkennung",
  "lokal-fallback": "Analyse: lokale Muster-Erkennung (API-Fehler)"
};

analysierenBtn.addEventListener("click", async () => {
  analysierenBtn.disabled = true;
  setStatus("Analysiere … das kann je nach Textmenge etwas dauern.");

  try {
    const result = await sendToTab("analyze");
    if (!result?.ok) {
      setStatus(result?.error || "Unbekannter Fehler", true);
    } else {
      const c = result.counts;
      const wort = result.total === 1 ? "Abschnitt" : "Abschnitte";
      const umfang =
        result.scope === "selection" ? `${wort} im markierten Bereich` : wort;
      const zaehlung = AMPEL_STUFEN.map((s) => `${s.kurz}: ${c[s.id]}`).join(", ");
      let text =
        `${result.total} ${umfang} bewertet:\n${zaehlung}\n` +
        (MODUS_TEXT[result.mode] || "");
      if (result.apiError) {
        text += `\n(${result.apiError})`;
      }
      setStatus(text, Boolean(result.apiError));
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

document.getElementById("einstellungen").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
