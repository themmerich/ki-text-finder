// Prüft die Regel-Engine gegen die Testseite: erwartete Stufen je Absatz
// und die Spracherkennung. Läuft mit purem Node, kein Browser nötig.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(root, "heuristik.js"), "utf8") +
    "\nthis.H = KI_AMPEL_HEURISTIK;",
  ctx
);

const html = fs.readFileSync(path.join(root, "test-seite.html"), "utf8");
const absaetze = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) =>
  m[1].replace(/\s+/g, " ").trim()
);
const segments = absaetze
  .filter((t) => t.length >= 150)
  .map((t, i) => ({ id: i, text: t }));

// Reihenfolge wie auf der Testseite; Änderungen an Seite oder Engine,
// die Einstufungen verschieben, sollen hier auffallen.
const SOLL = ["gruen", "rot", "rot", "gelb", "gruen", "gruen", "rot", "gruen", "rot"];

const fehler = [];
if (segments.length !== SOLL.length) {
  fehler.push(`Segmentzahl: ${segments.length} statt ${SOLL.length}`);
}
const ratings = ctx.H.bewerteSegmente(segments);
ratings.forEach((r, i) => {
  if (r.stufe !== SOLL[i]) fehler.push(`Segment ${i}: ${r.stufe} statt ${SOLL[i]}`);
});
if (ratings[6] && !/^Analyse auf Englisch/.test(ratings[6].grund)) {
  fehler.push(`Segment 6 nicht als Englisch erkannt: ${ratings[6].grund}`);
}
if (ratings[8] && !/^Analyse auf Deutsch/.test(ratings[8].grund)) {
  fehler.push(`Segment 8 nicht als Deutsch erkannt: ${ratings[8].grund}`);
}

if (fehler.length) {
  console.error("heuristik.test FEHLGESCHLAGEN:\n" + fehler.join("\n"));
  process.exit(1);
}
console.log(`heuristik.test: ${ratings.length} Segmente wie erwartet`);
