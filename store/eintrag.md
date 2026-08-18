# Store-Eintrag: Texte und Angaben

Vorbereitete Inhalte für die Einreichung im Chrome Web Store
(https://chrome.google.com/webstore/devconsole).

## Kurzbeschreibung

Wird automatisch aus der `description` in [manifest.json](../manifest.json) übernommen (Limit: 132 Zeichen):

> Färbt Textabschnitte der Seite als Ampel (rot/gelb/grün) ein, je nachdem wie wahrscheinlich sie KI-generiert sind.

## Ausführliche Beschreibung

> Spot the Bot färbt die Textabschnitte der gerade geöffneten Webseite als Ampel ein:
>
> 🔴 Rot – höchstwahrscheinlich KI-generiert (deutliche Häufung typischer Merkmale)
> 🟡 Gelb – wahrscheinlich KI-generiert (einzelne klare Auffälligkeiten)
> 🟢 Grün – vermutlich nicht KI-generiert
>
> Die Begründung zu jedem Abschnitt erscheint als Tooltip, wenn du mit der Maus darüberfährst.
>
> GANZE SEITE, EIN AUSSCHNITT ODER EIGENER TEXT
>
> Ohne Markierung wird die ganze Seite bewertet. Markierst du vorher einen Textabschnitt, prüft die Erweiterung nur diesen Bereich – schneller, günstiger und gezielt bei langen Seiten. Und über „Eigenen Text prüfen" fügst du beliebigen Text direkt ins Popup ein, etwa eine E-Mail oder einen Kommentar.
>
> ZWEI ANALYSE-MODI
>
> Ohne API-Key (Standard): Eine lokale Regel-Engine prüft die Texte auf bekannte KI-Stilmuster – Floskeln, Gedankenstrich-Häufung, Chatbot-Artefakte und mehr. Kostenlos, und kein Text verlässt den Browser.
>
> Mit eigenem Anthropic API-Key: Claude bewertet die Abschnitte inhaltlich, was deutlich genauer ist. Der Key wird nur lokal gespeichert und ausschließlich an api.anthropic.com gesendet. Schlägt die API fehl, springt automatisch die lokale Erkennung ein.
>
> OHNE KONTO, OHNE LIMIT
>
> Kein Login, kein Tageslimit, keine Anbieter-Server. Die Begründung steht direkt am Text statt als nackter Prozentwert – jede Einstufung nennt die konkreten Auffälligkeiten.
>
> WICHTIG
>
> Die Bewertung ist eine stilistische Einschätzung, kein Nachweis. Fehleinschätzungen in beide Richtungen sind möglich. Kurze Abschnitte (unter 150 Zeichen) werden nicht bewertet.

## Kategorie und Sprache

- Kategorie: Tools (alternativ: Produktivität)
- Sprache: Deutsch

## Grafiken

- Store-Icon 128×128: [icons/icon128.png](../icons/icon128.png)
- Werbekacheln (optional, aber hochladen): [store/werbekacheln/](werbekacheln/) — `kachel-klein.png` (440×280) und `kachel-gross.png` (1400×560)
- Screenshots 1280×800: [store/screenshots/](screenshots/)
  - `markierte-seite.png` – Testseite mit Ampel-Markierung und Tooltip
  - `auswahl.png` – markierter Text: nur die berührten Absätze werden bewertet
  - `popup.png` – Popup mit Analyse-Ergebnis
  - `einstellungen.png` – Einstellungsseite

## Weitere Felder (Store-Eintrag)

- Offizielle URL: „Keine" (nur mit Search-Console-Domain möglich)
- URL der Startseite: https://github.com/themmerich/ki-text-finder
- Support-URL: https://github.com/themmerich/ki-text-finder/issues
- Nicht jugendfreie Inhalte: aus

## Datenschutz-Formular (Privacy practices)

- **Single purpose:** Bewertet Textabschnitte der aktiven Webseite danach, wie wahrscheinlich sie KI-generiert sind, und färbt sie entsprechend ein.
- **activeTab / scripting:** Liest nach Klick auf „Seite analysieren" die sichtbaren Textabschnitte der aktiven Seite und färbt sie ein. Beim Öffnen des Popups wird zusätzlich abgefragt, ob auf der Seite Text markiert ist, um den Button passend zu beschriften; dabei wird nur geprüft, ob eine Markierung existiert, nicht deren Inhalt gelesen. Kein Zugriff ohne Nutzeraktion (das Öffnen des Popups ist eine solche).
- **storage:** Speichert API-Key und Einstellungen lokal auf dem Gerät.
- **Host-Berechtigung api.anthropic.com:** Sendet im optionalen Claude-Modus die Textabschnitte zur Bewertung an die Claude API.
- **Datenerhebung:** „Website content" ankreuzen (Textabschnitte der analysierten Seite bzw. vom Nutzer eingefügter Text gehen im Claude-Modus an Anthropic) sowie „Authentication information" für den vom Nutzer selbst hinterlegten API-Key (wird nur lokal gespeichert und an api.anthropic.com übertragen). Keine Weitergabe an weitere Dritte, kein Verkauf, keine Nutzung für fremde Zwecke.
- **Datenschutzerklärung (URL):** https://github.com/themmerich/ki-text-finder/blob/main/DATENSCHUTZ.md

## Einreichen

1. ZIP hochladen (siehe [store/README](#zip-paket) unten)
2. Texte und Grafiken von oben eintragen
3. Datenschutz-Formular ausfüllen, Datenschutz-URL angeben
4. Sichtbarkeit wählen: „Öffentlich" oder „Nicht gelistet" (installierbar per Link, nicht über die Suche auffindbar – gut für eine Testrunde)
5. Zur Prüfung einreichen; dauert erfahrungsgemäß einige Tage

## ZIP-Paket

Das Paket enthält nur die Laufzeitdateien: `manifest.json`, `background.js`, `content.js`, `heuristik.js`, `ampel.js`, `modelle.js`, `popup.html`, `popup.js`, `options.html`, `options.js`, `icons/`. Neu erzeugen:

```powershell
tar -a -c -f store/spot-the-bot-1.0.zip manifest.json background.js content.js heuristik.js ampel.js modelle.js popup.html popup.js options.html options.js icons
```

Hinweis: bewusst `tar` statt `Compress-Archive` – Letzteres schreibt unter Windows PowerShell 5.1 Backslash-Pfade ins Archiv, daran kann der Store-Upload scheitern.
