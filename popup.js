const statusEl = document.getElementById("status");
const analysierenBtn = document.getElementById("analysieren");
const entfernenBtn = document.getElementById("entfernen");
const mitKiEl = document.getElementById("mitKi");
const kiOptionLabel = document.getElementById("kiOptionLabel");
const kiOptionHinweis = document.getElementById("kiOptionHinweis");

// Checkbox-Zustand herstellen: ohne Key ausgegraut, mit Key wählbar
// (Auswahl wird gespeichert, Standard ist "mit KI").
chrome.storage.local.get(["apiKey", "useKi"]).then(({ apiKey, useKi }) => {
  if (!apiKey) {
    mitKiEl.checked = false;
    mitKiEl.disabled = true;
    kiOptionLabel.classList.add("deaktiviert");
    kiOptionHinweis.textContent = "(kein API-Key hinterlegt)";
  } else {
    mitKiEl.checked = useKi !== false;
    mitKiEl.disabled = false;
  }
});

mitKiEl.addEventListener("change", () => {
  chrome.storage.local.set({ useKi: mitKiEl.checked });
});

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "fehler" : "";
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

function analysierbar(tab) {
  return Boolean(tab?.id) && /^(https?|file):/.test(tab.url || "");
}

// Beim Öffnen prüfen, ob auf der Seite etwas markiert ist: dann analysiert
// der Klick nur die markierten Abschnitte, und der Button sagt das auch.
(async () => {
  try {
    const tab = await activeTab();
    if (!analysierbar(tab)) return;
    await ensureContentScript(tab.id);
    const result = await chrome.tabs.sendMessage(tab.id, { cmd: "hasSelection" });
    if (result?.hasSelection) {
      analysierenBtn.textContent = "Markierten Text analysieren";
    }
  } catch (_) {
    // Kein Content Script erreichbar: Standardbeschriftung bleibt stehen.
  }
})();

const MODUS_TEXT = {
  ki: "Analyse: Claude API",
  lokal: "Analyse: lokale Muster-Erkennung",
  "lokal-fallback": "Analyse: lokale Muster-Erkennung (API-Fehler)"
};

analysierenBtn.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!analysierbar(tab)) {
    setStatus("Diese Seite kann nicht analysiert werden.", true);
    return;
  }

  analysierenBtn.disabled = true;
  setStatus("Analysiere … das kann je nach Textmenge etwas dauern.");

  try {
    await ensureContentScript(tab.id);
    const result = await chrome.tabs.sendMessage(tab.id, { cmd: "analyze" });
    if (!result?.ok) {
      setStatus(result?.error || "Unbekannter Fehler", true);
    } else {
      const c = result.counts;
      const wort = result.total === 1 ? "Abschnitt" : "Abschnitte";
      const umfang =
        result.scope === "selection" ? `${wort} im markierten Bereich` : wort;
      let text =
        `${result.total} ${umfang} bewertet:\n` +
        `rot: ${c.rot}, gelb: ${c.gelb}, grün: ${c.gruen}\n` +
        (MODUS_TEXT[result.mode] || "");
      if (result.mode === "lokal-fallback" && result.apiError) {
        text += `\n(${result.apiError})`;
      }
      setStatus(text, result.mode === "lokal-fallback");
    }
  } catch (err) {
    setStatus(String(err.message || err), true);
  } finally {
    analysierenBtn.disabled = false;
  }
});

entfernenBtn.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id) return;
  try {
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { cmd: "clear" });
    setStatus("Markierungen entfernt.");
  } catch (err) {
    setStatus(String(err.message || err), true);
  }
});

document.getElementById("einstellungen").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
