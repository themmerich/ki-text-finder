# KI-Text-Finder

Chrome-Erweiterung, die Textabschnitte der aktuellen Webseite danach einfärbt, wie wahrscheinlich sie KI-generiert sind:

- **Rot** – höchstwahrscheinlich KI-generiert (deutliche Häufung typischer Merkmale)
- **Gelb** – wahrscheinlich KI-generiert (einzelne klare Auffälligkeiten)
- **Grün** – vermutlich nicht KI-generiert

Die Begründung zu jedem Abschnitt erscheint als Tooltip, wenn man mit der Maus darüberfährt.

Die Erweiterung hat zwei Analyse-Modi:

- **Ohne API-Key** (Standard): eine lokale Regel-Engine ([heuristik.js](heuristik.js)) prüft die Texte auf bekannte KI-Stilmuster – Floskel-Listen, Gedankenstrich-Häufung, „nicht nur … sondern auch", Verbindungswort-Ketten, Chatbot-Zitierartefakte. Kostenlos, offline, aber gröber: Sie erkennt unbearbeiteten KI-Text zuverlässig, übersieht polierten aber weitgehend.
- **Mit API-Key**: Claude bewertet die Abschnitte inhaltlich, was deutlich genauer ist. Schlägt die API fehl, fällt die Erweiterung automatisch auf die lokale Erkennung zurück; das Popup zeigt an, welcher Modus gelaufen ist.

Im Popup steuert die Checkbox **„mit KI untersuchen"**, welcher Modus läuft: Ohne hinterlegten Key ist sie ausgegraut und es läuft immer die lokale Erkennung. Mit Key ist sie standardmäßig aktiv, kann aber abgewählt werden, wenn die schnelle, kostenlose Analyse reichen soll. Die Auswahl bleibt gespeichert.

## Installation

1. Chrome öffnen und `chrome://extensions` aufrufen
2. Oben rechts den **Entwicklermodus** aktivieren
3. **„Entpackte Erweiterung laden"** klicken und diesen Ordner auswählen
4. Optional: in den Einstellungen der Erweiterung einen Anthropic API-Key eintragen (von platform.claude.com) für die genauere Claude-Analyse

## Bedienung

Icon anklicken → **„Seite analysieren"**. Nach einigen Sekunden sind die Absätze eingefärbt; das Popup zeigt die Verteilung. **„Markierungen entfernen"** stellt die Seite wieder her.

## Wie es funktioniert

- `content.js` sammelt sichtbare Textblöcke (`p`, `li`, `blockquote`, `dd`, `figcaption`) ab 150 Zeichen, höchstens 120 pro Seite.
- `background.js` entscheidet je nach hinterlegtem Key: ohne Key bewertet `heuristik.js` lokal (gewichteter Punktwert über Musterlisten, deutsch und englisch; eindeutige Chatbot-Artefakte führen direkt zu Rot). Mit Key gehen die Abschnitte gebündelt an die Claude API (Structured Outputs, festes JSON-Schema); lange Seiten werden auf mehrere Anfragen aufgeteilt.
- Der API-Key liegt nur in `chrome.storage.local` und wird ausschließlich an `api.anthropic.com` gesendet. Im lokalen Modus verlässt kein Text den Browser.

## Grenzen

Die Bewertung ist eine stilistische Einschätzung, kein Nachweis. Sie stützt sich auf bekannte Merkmale KI-generierter Texte (vgl. die Wikipedia-Seite „Signs of AI writing"). Fehleinschätzungen in beide Richtungen sind möglich – glatter menschlicher Text kann gelb eingestuft werden, nachbearbeiteter KI-Text grün. Kurze Abschnitte (unter 150 Zeichen) werden gar nicht bewertet.

Ein harter Nachweis wäre nur über das statistische Wasserzeichen möglich, das Anthropic seit August 2026 in Claude-Ausgaben einbettet. Die dafür angekündigte Detektions-API ist noch nicht verfügbar; sobald sie erscheint, ließe sie sich hier als zweite Prüfstufe einbauen (harter Befund für Claude-Texte, Stilanalyse als Heuristik für alles andere).
