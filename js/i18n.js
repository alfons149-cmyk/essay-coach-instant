// js/i18n.js — tiny inline i18n engine (EN / ES / NL)
(() => {
  const DICTS = {
    // ---------------- ENGLISH ----------------
    en: {
      "meta.title": "EssayCoach \u2013 Cambridge Toolkit (EN)",
      "app.name": "EssayCoach",
      "app.subtitle": "EssayCoach \u2013 Cambridge Toolkit",
      "app.tagline": "Built on 25 years of Cambridge exam classroom experience.",

      "labels.level": "Level:",
      "labels.prompt": "Task prompt",
      "labels.essay": "Your essay",
      "labels.feedback": "Your personalised feedback",
      "labels.edits": "Edits",
      "labels.next_draft": "Corrected essay",
      "labels.vocab_options": "Vocabulary options",
      "labels.sentence_insights": "Sentence insights",
      "labels.course_book": "Read the Course Book",

      "buttons.correct": "Correct",
      "buttons.clear": "Clear",

      "io.input_words": "Input: {n} words",
      "io.output_words": "Output: {n} words",

      "placeholders.task": "Paste the exam task here...",
      "placeholders.essay": "Paste or write your essay here...",
      "placeholders.next_draft": "Start your next draft here...",

      "tooltips.lang_en": "Switch to English",
      "tooltips.lang_es": "Switch to Spanish",
      "tooltips.lang_nl": "Switch to Dutch",
      "tooltips.correct": "Correct the essay",
      "tooltips.clear": "Clear all fields",

      "vocab.none": "No suggestions.",

      "bands.title": "Estimated Cambridge band",
      "bands.overall_score": "Estimated score",
      "bands.level_label": "Exam level",
      "bands.category_title": "By criteria",
      "bands.category.Content": "Content",
      "bands.category.Communicative_Achievement": "Communicative achievement",
      "bands.category.Organisation": "Organisation",
      "bands.category.Language": "Language",
      "bands.band.low": "Lower band",
      "bands.band.mid": "Middle band",
      "bands.band.high": "Higher band",
      "bands.improvement_title": "What to improve to go up a band",
      "bands.disclaimer": "This score is an estimate based on the Cambridge English Scale and not an official exam grade.",

      "sentence.title": "How your sentences are built",
      "sentence.read_unit": "Read the unit in the Course Book.",

      "paragraph.title": "Paragraph logic & structure",
      "paragraph.role.intro": "Introduction",
      "paragraph.role.body": "Body paragraph",
      "paragraph.role.conclusion": "Conclusion",

      "debug.show": "Show advanced AI details",
      "debug.hide": "Hide advanced AI details",
      "debug.title": "AI response (advanced details)",

      "status.correcting": "Correcting your essay… this may take a little while.",

      "sections.task_title": "Task",
      "sections.task_hint": "Paste the exam task here so the coach knows what you are answering.",
      "sections.essay_title": "Your essay",
      "sections.essay_hint": "Aim for the full word limit. You can revise as many times as you like.",

      "labels.task_prompt": "Task prompt",
      "labels.essay_prompt": "Write your answer",
      "labels.wordcount_input_prefix": "Input:",
      "labels.wordcount_words": "words",

      "placeholders.task_prompt": "Copy the question from the exam paper here...",
      "placeholders.essay_prompt": "Write your answer here...",

      "summary.title": "Quick exam summary",
      "summary.hint": "A short snapshot of how this draft would score in the exam and what to improve first.",
      "summary.estimated_band": "Estimated band",
      "summary.key_focus_title": "Key focus",
      "summary.key_focus_label": "Most important thing to fix",
      "summary.output_length": "Output length"
    },

    // ---------------- SPANISH ----------------
    es: {
      "meta.title": "EssayCoach \u2013 Kit de Cambridge (ES)",
      "app.name": "EssayCoach",
      "app.subtitle": "EssayCoach \u2013 Kit de Cambridge",
      "app.tagline": "Basado en 25 años de experiencia en el aula preparando exámenes de Cambridge.",

      "labels.level": "Nivel:",
      "labels.prompt": "Enunciado de la tarea",
      "labels.essay": "Tu redacción",
      "labels.feedback": "Tu retroalimentación personalizada",
      "labels.edits": "Correcciones",
      "labels.next_draft": "Redacción corregida",
      "labels.vocab_options": "Opciones de vocabulario",
      "labels.sentence_insights": "Análisis de oraciones",
      "labels.course_book": "Leer el libro del curso",

      "buttons.correct": "Corregir",
      "buttons.clear": "Limpiar",

      "io.input_words": "Entrada: {n} palabras",
      "io.output_words": "Salida: {n} palabras",

      "placeholders.task": "Pega aquí el enunciado del examen...",
      "placeholders.essay": "Escribe o pega aquí tu redacción...",
      "placeholders.next_draft": "Empieza aquí tu siguiente versión...",

      "tooltips.lang_en": "Cambiar a inglés",
      "tooltips.lang_es": "Cambiar a español",
      "tooltips.lang_nl": "Cambiar a neerlandés",
      "tooltips.correct": "Corregir la redacción",
      "tooltips.clear": "Vaciar todos los campos",

      "vocab.none": "Sin sugerencias.",

      "bands.title": "Resultado estimado según la escala Cambridge",
      "bands.overall_score": "Puntuación estimada",
      "bands.level_label": "Nivel del examen",
      "bands.category_title": "Por criterios",
      "bands.category.Content": "Contenido",
      "bands.category.Communicative_Achievement": "Logro comunicativo",
      "bands.category.Organisation": "Organización",
      "bands.category.Language": "Lengua",
      "bands.band.low": "Tramo bajo",
      "bands.band.mid": "Tramo medio",
      "bands.band.high": "Tramo alto",
      "bands.improvement_title": "Qué mejorar para subir de banda",
      "bands.disclaimer": "Esta puntuación es una estimación basada en la escala Cambridge y no sustituye una calificación oficial del examen.",

      "sentence.title": "Cómo están construidas tus oraciones",
      "sentence.read_unit": "Lee la unidad correspondiente en el Course Book.",

      "paragraph.title": "Lógica y estructura de los párrafos",
      "paragraph.role.intro": "Introducción",
      "paragraph.role.body": "Párrafo de desarrollo",
      "paragraph.role.conclusion": "Conclusión",

      "debug.show": "Mostrar detalles avanzados de la IA",
      "debug.hide": "Ocultar detalles avanzados de la IA",
      "debug.title": "Respuesta de la IA (detalles avanzados)",

      "status.correcting": "Corrigiendo tu redacción… esto puede tardar un poco.",

      "sections.task_title": "Tarea",
      "sections.task_hint": "Pega aquí la tarea del examen para que el coach sepa qué estás respondiendo.",
      "sections.essay_title": "Tu redacción",
      "sections.essay_hint": "Intenta llegar al límite completo de palabras. Puedes revisar el texto tantas veces como quieras.",

      "labels.task_prompt": "Enunciado de la tarea",
      "labels.essay_prompt": "Escribe tu respuesta",
      "labels.wordcount_input_prefix": "Entrada:",
      "labels.wordcount_words": "palabras",

      "placeholders.task_prompt": "Copia aquí la pregunta del examen...",
      "placeholders.essay_prompt": "Escribe tu respuesta aquí...",

      "summary.title": "Resumen rápido del examen",
      "summary.hint": "Una foto rápida de cómo puntuaría este borrador y qué mejorar primero.",
      "summary.estimated_band": "Banda estimada",
      "summary.key_focus_title": "En qué centrarte",
      "summary.key_focus_label": "Lo más importante a mejorar",
      "summary.output_length": "Longitud del texto"
    },

    // ---------------- DUTCH ----------------
    nl: {
      "meta.title": "EssayCoach \u2013 Cambridge Toolkit (NL)",
      "app.name": "EssayCoach",
      "app.subtitle": "EssayCoach \u2013 Cambridge Toolkit",
      "app.tagline": "Gebaseerd op 25 jaar ervaring met Cambridge-examens in de klas.",

      "labels.level": "Niveau:",
      "labels.prompt": "Taak",
      "labels.essay": "Je essay",
      "labels.feedback": "Je persoonlijke feedback",
      "labels.edits": "Wijzigingen",
      "labels.next_draft": "Gecorrigeerd essay",
      "labels.vocab_options": "Woordenschat-opties",
      "labels.sentence_insights": "Zinsinzichten",
      "labels.course_book": "Lees het cursusboek",

      "buttons.correct": "Corrigeren",
      "buttons.clear": "Alles wissen",

      "io.input_words": "Invoer: {n} woorden",
      "io.output_words": "Uitvoer: {n} woorden",

      "placeholders.task": "Plak hier de examenvraag...",
      "placeholders.essay": "Plak of schrijf hier je essay...",
      "placeholders.next_draft": "Begin hier met je volgende versie...",

      "tooltips.lang_en": "Overschakelen naar Engels",
      "tooltips.lang_es": "Overschakelen naar Spaans",
      "tooltips.lang_nl": "Overschakelen naar Nederlands",
      "tooltips.correct": "Het essay corrigeren",
      "tooltips.clear": "Alle velden wissen",

      "vocab.none": "Geen suggesties.",

      "bands.title": "Geschatte Cambridge-band",
      "bands.overall_score": "Geschatte score",
      "bands.level_label": "Examen­niveau",
      "bands.category_title": "Per criterium",
      "bands.category.Content": "Inhoud",
      "bands.category.Communicative_Achievement": "Communicatieve prestatie",
      "bands.category.Organisation": "Opbouw",
      "bands.category.Language": "Taalgebruik",
      "bands.band.low": "Lagere band",
      "bands.band.mid": "Middenband",
      "bands.band.high": "Hogere band",
      "bands.improvement_title": "Wat je kunt verbeteren om een band omhoog te gaan",
      "bands.disclaimer": "Deze score is een schatting op basis van de Cambridge English Scale en geen officieel examencijfer.",

      "sentence.title": "Hoe je zinnen zijn opgebouwd",
      "sentence.read_unit": "Lees de unit in het cursusboek.",

      "paragraph.title": "Logica en structuur van alinea’s",
      "paragraph.role.intro": "Inleiding",
      "paragraph.role.body": "Kernalinea",
      "paragraph.role.conclusion": "Slotalinea",

      "debug.show": "Geavanceerde AI-details tonen",
      "debug.hide": "Geavanceerde AI-details verbergen",
      "debug.title": "AI-respons (geavanceerde details)",

      "status.correcting": "Je essay wordt gecorrigeerd… dit kan even duren.",

      "sections.task_title": "Opdracht",
      "sections.task_hint": "Plak hier de examenopdracht zodat de coach weet wat je beantwoordt.",
      "sections.essay_title": "Je essay",
      "sections.essay_hint": "Probeer het volledige aantal woorden te halen. Je kunt zo vaak herschrijven als je wilt.",

      "labels.task_prompt": "Opdrachttekst",
      "labels.essay_prompt": "Schrijf je antwoord",
      "labels.wordcount_input_prefix": "Invoer:",
      "labels.wordcount_words": "woorden",

      "placeholders.task_prompt": "Kopieer hier de vraag van het examen...",
      "placeholders.essay_prompt": "Schrijf hier je antwoord...",

      "summary.title": "Snelle examensamenvatting",
      "summary.hint": "Een korte momentopname van hoe dit concept zou scoren en wat je als eerste kunt verbeteren.",
      "summary.estimated_band": "Geschatte band",
      "summary.key_focus_title": "Belangrijkste aandachtspunt",
      "summary.key_focus_label": "Belangrijkste om te verbeteren",
      "summary.output_length": "Lengte van de output"
    }
  };

  const I18N = {
    _lang: "en",
    _dict: DICTS.en,

    setLanguage(lang) {
      const code = (lang || "en").toLowerCase();
      this._lang = DICTS[code] ? code : "en";
      this._dict = DICTS[this._lang];
      // app.js sometimes expects a Promise
      return Promise.resolve(this._dict);
    },

    getLanguage() {
      return this._lang;
    },

    t(key, vars) {
      if (!key) return "";
      const raw = this._dict && this._dict[key];
      if (!raw || typeof raw !== "string") return key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      );
    }
  };

  window.I18N = I18N;

  // Initial language (from localStorage or <html lang>)
  const initial =
    localStorage.getItem("ec.lang") ||
    document.documentElement.lang ||
    "en";

  I18N.setLanguage(initial);
})();
