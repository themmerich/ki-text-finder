// Gemeinsame Definition der Ampelstufen. Wird in drei Kontexten geladen:
// popup.html per Script-Tag (Legende, Zählzeile), content.js per
// executeScript-files (Einfärbung, Tooltips), background.js per importScripts
// (enum im JSON-Schema). Deshalb var statt const: die Datei kann beim
// erneuten Öffnen des Popups ein zweites Mal in die Seite injiziert werden.
//
// Die Flächenfarben sind bewusst deckend (kein Alpha): halbtransparente
// helle Töne versinken auf dunklen Seiten im Hintergrund. Dazu setzt
// content.js die Textfarbe AMPEL_TEXTFARBE, damit helle Schrift dunkler
// Seiten auf dem Pastell lesbar bleibt. Auf weißen Seiten entsprechen die
// Werte exakt den früheren rgba-Farben.
var AMPEL_TEXTFARBE = "#1f1f1f";
var AMPEL_STUFEN = [
  {
    id: "rot",
    kurz: "rot",
    label: "höchstwahrscheinlich KI-generiert",
    bg: "rgb(245, 198, 203)",
    punkt: "rgba(220, 53, 69, 0.6)"
  },
  {
    id: "gelb",
    kurz: "gelb",
    label: "wahrscheinlich KI-generiert",
    bg: "rgb(255, 236, 181)",
    punkt: "rgba(255, 193, 7, 0.75)"
  },
  {
    id: "gruen",
    kurz: "grün",
    label: "vermutlich nicht KI-generiert",
    bg: "rgb(218, 236, 228)",
    punkt: "rgba(25, 135, 84, 0.5)"
  }
];
