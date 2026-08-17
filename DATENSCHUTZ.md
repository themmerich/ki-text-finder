# Datenschutzerklärung – Spot the Bot

Stand: 16. August 2026

Spot the Bot ist eine Chrome-Erweiterung, die Textabschnitte der gerade geöffneten Webseite danach einfärbt, wie wahrscheinlich sie KI-generiert sind.

## Was die Erweiterung verarbeitet

Bei einer Analyse liest die Erweiterung die sichtbaren Textabschnitte der aktiven Seite (Absätze, Listenpunkte, Zitate). Zusätzlich kannst du eigenen Text in das Popup einfügen und prüfen lassen. Beides passiert nur, wenn du es im Popup auslöst; die Erweiterung liest nicht im Hintergrund mit.

**Lokaler Modus (Standard, ohne API-Key):** Die Texte werden ausschließlich im Browser durch eine Regel-Engine geprüft. Es verlässt kein Text dein Gerät.

**Claude-Modus (mit API-Key):** Die Textabschnitte der analysierten Seite (bzw. der von dir eingefügte Text) werden zur Bewertung an die Claude API von Anthropic (api.anthropic.com) gesendet. Für diese Verarbeitung gilt die [Datenschutzerklärung von Anthropic](https://www.anthropic.com/legal/privacy). Dieser Modus ist nur aktiv, wenn du selbst einen API-Key hinterlegt und die Option „mit KI untersuchen" eingeschaltet hast.

## Was gespeichert wird

Im lokalen Erweiterungsspeicher (`chrome.storage.local`) liegen nur deine Einstellungen: der API-Key (falls hinterlegt), das gewählte Modell und der Zustand der Analyse-Option. Diese Daten bleiben auf deinem Gerät und werden ausschließlich an api.anthropic.com übertragen, soweit das für die Claude-Analyse nötig ist. Analysierte Texte und Ergebnisse werden nicht gespeichert; die Markierungen verschwinden beim Neuladen der Seite.

## Was nicht passiert

Der Entwickler betreibt keine eigenen Server und erhält keine Daten. Die Erweiterung enthält keine Analyse-, Statistik- oder Werbedienste, setzt keine Cookies und erstellt keine Nutzungsprofile. Es werden keine Daten an Dritte verkauft oder weitergegeben; einziger Empfänger ist – im Claude-Modus – Anthropic.

## Berechtigungen

- `activeTab` / `scripting`: um die Texte der aktiven Seite zu lesen und die Markierungen einzufärben, jeweils erst nach Klick auf „Seite analysieren"
- `storage`: um API-Key und Einstellungen lokal zu speichern
- Host-Zugriff auf `api.anthropic.com`: um im Claude-Modus die Bewertung abzurufen

## Kontakt

Fragen zu dieser Erweiterung kannst du über die [Issues-Seite des Projekts](https://github.com/themmerich/ki-text-finder/issues) stellen.
