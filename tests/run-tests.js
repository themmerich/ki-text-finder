// Führt alle Prüfungen aus: Syntax-Check, Regel-Engine (Node) und
// Content Script (Headless-Chrome). Aufruf: node tests/run-tests.js
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// 1) Syntax-Check aller Skripte
const skripte = [
  "ampel.js",
  "modelle.js",
  "heuristik.js",
  "content.js",
  "background.js",
  "popup.js",
  "options.js"
];
for (const datei of skripte) {
  execFileSync(process.execPath, ["--check", path.join(root, datei)], {
    stdio: "inherit"
  });
}
console.log(`Syntax ok (${skripte.length} Dateien)`);

// 2) Regel-Engine gegen die Testseite
execFileSync(process.execPath, [path.join(__dirname, "heuristik.test.js")], {
  stdio: "inherit"
});

// 3) Content Script im Headless-Chrome
function findeChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const kandidaten =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ];
  return kandidaten.find((p) => fs.existsSync(p));
}

const chrome = findeChrome();
if (!chrome) {
  console.error("Kein Chrome gefunden – Pfad über CHROME_PATH setzen.");
  process.exit(1);
}

const url =
  "file:///" + path.join(__dirname, "content.test.html").replace(/\\/g, "/");
const lauf = spawnSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--virtual-time-budget=5000",
    "--dump-dom",
    url
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);
const dom = lauf.stdout || "";
const titel = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
if (titel !== "PASS") {
  const detail =
    (dom.match(/<pre id="ergebnis">([\s\S]*?)<\/pre>/) || [])[1] ||
    lauf.stderr ||
    "keine Ausgabe";
  console.error("content.test FEHLGESCHLAGEN:\n" + detail.trim());
  process.exit(1);
}
console.log("content.test: alle Prüfungen bestanden");
