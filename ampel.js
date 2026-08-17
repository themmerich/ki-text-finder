// Gemeinsame Definition der Ampelstufen. Wird in drei Kontexten geladen:
// popup.html per Script-Tag (Legende, Zählzeile), content.js per
// executeScript-files (Einfärbung, Tooltips), background.js per importScripts
// (enum im JSON-Schema). Deshalb var statt const: die Datei kann beim
// erneuten Öffnen des Popups ein zweites Mal in die Seite injiziert werden.
var AMPEL_STUFEN = [
  {
    id: "rot",
    kurz: "rot",
    label: "höchstwahrscheinlich KI-generiert",
    bg: "rgba(220, 53, 69, 0.28)",
    punkt: "rgba(220, 53, 69, 0.6)"
  },
  {
    id: "gelb",
    kurz: "gelb",
    label: "wahrscheinlich KI-generiert",
    bg: "rgba(255, 193, 7, 0.30)",
    punkt: "rgba(255, 193, 7, 0.75)"
  },
  {
    id: "gruen",
    kurz: "grün",
    label: "vermutlich nicht KI-generiert",
    bg: "rgba(25, 135, 84, 0.16)",
    punkt: "rgba(25, 135, 84, 0.5)"
  }
];
