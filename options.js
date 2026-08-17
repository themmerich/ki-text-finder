const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const statusEl = document.getElementById("status");

// Auswahl aus der gemeinsamen Modell-Liste aufbauen (erstes Modell = Standard)
for (const modell of KI_MODELLE) {
  const option = document.createElement("option");
  option.value = modell.id;
  option.textContent = modell.name;
  modelEl.appendChild(option);
}

chrome.storage.local.get(["apiKey", "model"]).then(({ apiKey, model }) => {
  if (apiKey) apiKeyEl.value = apiKey;
  if (model) modelEl.value = model;
});

document.getElementById("speichern").addEventListener("click", async () => {
  const apiKey = apiKeyEl.value.trim();
  if (apiKey && !apiKey.startsWith("sk-ant-")) {
    statusEl.textContent = "Hinweis: Anthropic-Keys beginnen üblicherweise mit sk-ant-. Gespeichert wurde trotzdem.";
  } else {
    statusEl.textContent = "Gespeichert.";
  }
  await chrome.storage.local.set({ apiKey, model: modelEl.value });
  setTimeout(() => (statusEl.textContent = ""), 4000);
});
