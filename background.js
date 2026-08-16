// Service Worker: nimmt Textabschnitte vom Content Script entgegen und
// klassifiziert sie. Mit hinterlegtem API-Key über die Claude API,
// ohne Key über die lokale Regel-Engine (heuristik.js).

importScripts("heuristik.js");

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-5";
const MAX_CHARS_PER_REQUEST = 40000; // Segmente werden in Blöcke dieser Größe gebündelt

const SYSTEM_PROMPT = `Du bewertest Textabschnitte einer Webseite danach, wie wahrscheinlich sie von einer KI generiert wurden.

Achte auf bekannte Merkmale KI-generierter Texte, u. a.:
- aufgeblähte Bedeutungssprache ("spielt eine bedeutende Rolle", "unterstreicht die Bedeutung", "reiches Erbe")
- gehäufte Gedankenstriche, mechanische Verbindungswörter ("darüber hinaus", "zusätzlich") am Absatzanfang
- negativer Parallelismus ("nicht nur ..., sondern auch"), Dreierschemata, Synonym-Rotation
- Ausweichen vor schlichtem "ist/hat" ("dient als", "fungiert als", "stellt dar")
- Überstrukturierung, Fazit-Bausteine, "Herausforderungen und Ausblick"-Schemata
- redaktionelle Selbstkommentare ("es ist wichtig zu beachten", "erwähnenswert ist")
- Chatbot-Reste ("Ich hoffe, das hilft", Platzhaltertext, Zitierartefakte)

Wichtige Einschränkungen:
- Kein einzelnes Merkmal beweist etwas; verdächtig ist die Häufung.
- Formeller oder fehlerfreier Stil allein ist KEIN Indiz. Auch Behörden-, Marketing- und Nachrichtentexte von Menschen klingen oft glatt.
- Kurze Abschnitte lassen sich kaum beurteilen: im Zweifel "gruen".
- Sei konservativ: "rot" nur bei deutlicher Häufung mehrerer Merkmale, "gelb" bei einzelnen klaren Auffälligkeiten, sonst "gruen".

Bewerte jeden nummerierten Abschnitt einzeln. Der "grund" ist ein kurzer deutscher Satz, der die konkreten Auffälligkeiten nennt (oder warum keine vorliegen).`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    bewertungen: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          stufe: { type: "string", enum: ["rot", "gelb", "gruen"] },
          grund: { type: "string" }
        },
        required: ["id", "stufe", "grund"],
        additionalProperties: false
      }
    }
  },
  required: ["bewertungen"],
  additionalProperties: false
};

function chunkSegments(segments) {
  const chunks = [];
  let current = [];
  let currentChars = 0;
  for (const seg of segments) {
    if (current.length > 0 && currentChars + seg.text.length > MAX_CHARS_PER_REQUEST) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(seg);
    currentChars += seg.text.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function classifyChunk(apiKey, model, segments) {
  const numbered = segments
    .map((s) => `[Abschnitt ${s.id}]\n${s.text}`)
    .join("\n\n");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            "Bewerte die folgenden Abschnitte einer Webseite:\n\n" + numbered
        }
      ]
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err?.error?.message || "";
    } catch (_) {
      // Antwort war kein JSON
    }
    throw new Error(`API-Fehler ${response.status}: ${detail}`);
  }

  const data = await response.json();

  if (data.stop_reason === "refusal") {
    throw new Error("Die Anfrage wurde vom Modell abgelehnt (refusal).");
  }
  if (data.stop_reason === "max_tokens") {
    throw new Error("Antwort abgeschnitten (max_tokens erreicht) – Seite ist zu lang.");
  }

  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("Keine Textantwort vom Modell erhalten.");
  }
  return JSON.parse(textBlock.text).bewertungen;
}

async function classify(segments) {
  const { apiKey, model, useKi } = await chrome.storage.local.get([
    "apiKey",
    "model",
    "useKi"
  ]);

  // Lokale Regel-Engine: ohne API-Key, oder wenn die KI-Analyse
  // im Popup abgewählt wurde. Kostenlos und offline.
  if (!apiKey || useKi === false) {
    return {
      ratings: KI_AMPEL_HEURISTIK.bewerteSegmente(segments),
      mode: "lokal"
    };
  }

  // Mit API-Key: Claude-Analyse; bei API-Fehlern Rückfall auf die Regel-Engine.
  try {
    const chunks = chunkSegments(segments);
    const all = [];
    for (const chunk of chunks) {
      const ratings = await classifyChunk(apiKey, model || DEFAULT_MODEL, chunk);
      all.push(...ratings);
    }
    return { ratings: all, mode: "ki" };
  } catch (err) {
    return {
      ratings: KI_AMPEL_HEURISTIK.bewerteSegmente(segments),
      mode: "lokal-fallback",
      apiError: String(err.message || err)
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.cmd !== "classify") return false;
  classify(message.segments)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true; // sendResponse wird asynchron aufgerufen
});
