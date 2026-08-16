// Lokale Regel-Engine: bewertet Textabschnitte ohne KI anhand bekannter
// Merkmale KI-generierter Texte (vgl. Wikipedia "Signs of AI writing" /
// "Anzeichen für KI-generierte Inhalte"). Läuft komplett im Browser.

const KI_AMPEL_HEURISTIK = (() => {

  // Eindeutige technische Artefakte: ein Treffer reicht für Rot.
  const HARTE_ARTEFAKTE = [
    { re: /utm_source=chatgpt\.com/i, label: "ChatGPT-Zitierlink (utm_source)" },
    { re: /oaicite|:contentReference/i, label: "ChatGPT-Zitierartefakt" },
    { re: /turn\d+(search|view)\d*/i, label: "ChatGPT-Suchartefakt" },
    { re: /\[cite:\s*\d+\]|\[span_\d+\]/i, label: "Gemini-Zitierartefakt" },
    { re: /grok_render_citation/i, label: "Grok-Zitierartefakt" },
    { re: /\b(als (KI|Sprachmodell)|as an AI( language)? model)\b/i, label: "KI-Selbstbezug" },
    { re: /\b(ich hoffe, (das|dies) hilft|I hope this helps)\b/i, label: "Chatbot-Dialogrest" },
    { re: /\[(Name|Datum|hier .{0,20}? einfügen|insert .{0,20}?)\]/i, label: "Platzhaltertext" }
  ];

  // Weiche Signale: zählen nur in der Häufung. Jedes hat Gewicht und Label.
  const SIGNALE = [
    {
      label: "Bedeutungs-/Werbefloskeln",
      gewicht: 2,
      re: /\b(spielt eine (bedeutende|entscheidende|zentrale) Rolle|unterstreicht die Bedeutung|steht als Zeugnis|hinterlässt einen bleibenden Eindruck|tief verwurzelt|reiches? (kulturelles? )?Erbe|bleibendes Vermächtnis|im Herzen von|atemberaubend|beeindruckende Schönheit|plays a (significant|crucial|vital|pivotal) role|underscores the importance|stands as a testament|rich cultural heritage|lasting legacy|nestled in the heart of|breathtaking)\b/gi
    },
    {
      label: "redaktionelle Selbstkommentare",
      gewicht: 2,
      re: /\b(es ist (wichtig|bemerkenswert|erwähnenswert)( zu beachten| anzumerken)?|erwähnenswert ist|it('s| is) (important|worth noting|noteworthy)( to note)?|it should be noted)\b/gi
    },
    {
      label: "KI-Modewörter",
      gewicht: 1,
      re: /\b(facettenreich|nahtlos|beleuchten wir|tauchen wir ein|die digitale Landschaft|in der heutigen (digitalen|schnelllebigen) Welt|delve|tapestry|seamlessly|multifaceted|vibrant|in today's (digital|fast-paced) (world|landscape)|ever-evolving)\b/gi
    },
    {
      label: "mechanische Verbindungswörter",
      gewicht: 1,
      re: /(^|[.!?]\s+)(Darüber hinaus|Des Weiteren|Zusätzlich|Ferner|Furthermore|Moreover|Additionally|In addition)\b/gm
    },
    {
      label: "negativer Parallelismus (nicht nur … sondern auch)",
      gewicht: 2,
      re: /\b(nicht nur\b.{0,100}?\bsondern( auch)?|not only\b.{0,100}?\bbut( also)?)\b/gi
    },
    {
      label: "Kopula-Vermeidung (dient als, fungiert als …)",
      gewicht: 1,
      re: /\b(dient als|fungiert als|stellt .{0,30}? dar|serves as|functions as|acts as|stands as)\b/gi
    },
    {
      label: "unechte Aufzählungsspanne (von … bis hin zu)",
      gewicht: 1,
      re: /\b(von .{3,50}? bis hin zu|ranging from .{3,50}? to)\b/gi
    },
    {
      label: "vage Autoritäten (Studien zeigen, Kritiker …)",
      gewicht: 1,
      re: /\b(Studien zeigen|Beobachter meinen|Kritiker argumentieren|Experten sind sich einig|studies (show|suggest)|experts agree|critics argue|observers note)\b/gi
    },
    {
      label: "gehäufte Gedankenstriche",
      gewicht: 1,
      // Parenthetische Striche; Zählung unten pro Vorkommen ab dem zweiten
      re: /(\s[—–]\s|—)/g,
      mindestensTreffer: 2
    }
  ];

  function bewerteSegment(text) {
    for (const art of HARTE_ARTEFAKTE) {
      if (art.re.test(text)) {
        return {
          stufe: "rot",
          grund: `Technisches Artefakt gefunden: ${art.label}. Das kommt in menschlich verfassten Texten praktisch nicht vor.`
        };
      }
    }

    let punkte = 0;
    const getroffen = [];
    for (const sig of SIGNALE) {
      const treffer = text.match(sig.re) || [];
      const minimum = sig.mindestensTreffer || 1;
      if (treffer.length >= minimum) {
        const zaehlbar = treffer.length - (minimum - 1);
        punkte += sig.gewicht * Math.min(zaehlbar, 3); // pro Signal gedeckelt
        getroffen.push(`${sig.label} (${treffer.length}×)`);
      }
    }

    // Dichte: Punkte auf 1000 Zeichen normiert, damit lange Absätze
    // nicht allein durch Länge auffällig werden.
    const dichte = (punkte * 1000) / Math.max(text.length, 200);

    let stufe = "gruen";
    if (getroffen.length >= 3 && dichte >= 8) {
      stufe = "rot";
    } else if (getroffen.length >= 2 && dichte >= 4) {
      stufe = "gelb";
    }

    const grund =
      getroffen.length === 0
        ? "Keine der bekannten KI-Stilmuster gefunden."
        : `Auffälligkeiten: ${getroffen.slice(0, 4).join(", ")}.` +
          (stufe === "gruen" ? " Häufung reicht nicht für eine Einstufung." : "");

    return { stufe, grund };
  }

  function bewerteSegmente(segments) {
    return segments.map((s) => {
      const ergebnis = bewerteSegment(s.text);
      return { id: s.id, stufe: ergebnis.stufe, grund: ergebnis.grund };
    });
  }

  return { bewerteSegmente };
})();
