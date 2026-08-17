// Gemeinsame Modell-Liste für die Einstellungsseite (Auswahl) und den
// Service Worker (Fallback, solange nie ein Modell gespeichert wurde).
// Das erste Modell ist der Standard.
var KI_MODELLE = [
  { id: "claude-opus-5", name: "Claude Opus 5 (beste Qualität, Standard)" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5 (schneller, günstiger)" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5 (am günstigsten)" }
];
