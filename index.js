// server/index.js  (ESM)
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import sanitizeHtml from 'sanitize-html';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import he from 'he';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── App & middleware ───────────────────────────────────────────────────
const app = express();
app.use(cors()); // allow all origins in dev; restrict later if needed
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ── Static files & homepage (serve /server/public) ─────────────────────
const PUBLIC_DIR = join(__dirname, 'public');
if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
  app.get('/', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
  console.log('[static] Serving', PUBLIC_DIR, 'at /');
} else {
  console.warn('[static] No /public folder at', PUBLIC_DIR);
}

// ── Config ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8888;

// ── Allowed HTML for improved_text ─────────────────────────────────────
const ALLOWED_TAGS  = ['p','br','em','strong','b','i','ul','ol','li','span','mark'];
const ALLOWED_ATTRS = { mark: ['class'] };

// ── Helpers ────────────────────────────────────────────────────────────
const wordBand = (level) => {
  if (level === 'B2') return { min: 140, max: 190 };
  if (level === 'C2') return { min: 240, max: 280 };
  return { min: 220, max: 260 }; // C1 default
};

function htmlToText(html = '') {
  let s = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return he.decode(s).replace(/\u00A0/g, ' ');
}

function wcOf(html) {
  const t = htmlToText(html);
  const m = t.match(/\b[\w’'-]+\b/gu);
  return m ? m.length : 0;
}

function sanitize(html = '') {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    disallowedTagsMode: 'discard',
  });
}

function nowISODate() {
  return new Date().toISOString().slice(0, 10);
}

// Load JSON fixtures from /server/fixtures/<name>.json
async function loadFixture(name) {
  const p = join(__dirname, 'fixtures', `${name}.json`);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

// Minimal input validation
function basicValidate(body) {
  if (!body || typeof body !== 'object') return 'Body must be JSON';
  const { text, options } = body;
  if (!text || typeof text !== 'string') return '`text` must be a non-empty string';
  if (!options || typeof options !== 'object') return '`options` must be provided';
  const { level, type, locale } = options;
  if (!['B2','C1','C2'].includes(level)) return '`options.level` must be B2|C1|C2';
  if (!['essay','report','proposal','review','letter'].includes(type)) return '`options.type` invalid';
  if (!['en','es'].includes(locale)) return '`options.locale` must be en|es';
  return null;
}

// Build a deterministic mock response (used when no fixture forced)
function buildSyntheticResponse({ text, options, task }) {
  const { level, type, locale } = options;
  const isC2Essay = (level === 'C2' && type === 'essay');

  const EN = {
    p1: 'In my view, cities should invest more in public transport; moreover, it would reduce congestion and improve air quality.',
    p2: 'However, it is essential to evaluate long-term costs and the sustainability of the system.',
  };
  const ES = {
    p1: 'En mi opinión, las ciudades deberían invertir más en transporte público; además, reduciría la congestión y mejoraría la calidad del aire.',
    p2: 'No obstante, es esencial evaluar el coste a largo plazo y la sostenibilidad del sistema.',
  };
  const P = (locale === 'es') ? ES : EN;

  let improved_text = sanitize(`<p>${P.p1}</p><p>${P.p2}</p>`);

  // Wordcount
  const { min, max } = wordBand(level);
  const actual = wcOf(improved_text);

  // Simple spans for demo
  const plain = htmlToText(improved_text);
  const idxHedge = plain.indexOf(locale === 'es' ? 'En mi opinión' : 'In my view');
  const spanHedge = idxHedge >= 0
    ? [idxHedge, idxHedge + (locale === 'es' ? 'En mi opinión'.length : 'In my view'.length)]
    : [0, 0];

  const idxMoreover = plain.toLowerCase().indexOf('moreover');
  const spanLinker = idxMoreover >= 0 ? [idxMoreover, idxMoreover + 'moreover'.length] : [0, 0];

  const c2Synth = isC2Essay
    ? { required: true, summary_ok: !!(task?.sourceA && task?.sourceB), evaluation_ok: !!(task?.sourceA && task?.sourceB) }
    : { required: false, summary_ok: null, evaluation_ok: null };

  const rubricBase = (lvl) => ({
    content: { score: lvl === 'C2' ? 5 : lvl === 'C1' ? 4 : 3, evidence: [ locale === 'es' ? 'Responde a la tarea con ejemplos' : 'Addresses the task with examples' ] },
    communicative_achievement: { score: 4, evidence: [ locale === 'es' ? 'Registro formal mantenido' : 'Sustained formal register' ] },
    organisation: { score: 4, evidence: [ locale === 'es' ? 'Párrafos claros y conectores' : 'Clear paragraphing and discourse markers' ] },
    language: { score: 4, evidence: [ locale === 'es' ? 'Buen rango con pocos errores' : 'Good range with few slips' ] },
  });

  const issues = [];
  if (spanHedge[1] > spanHedge[0]) {
    issues.push({
      span: spanHedge,
      category: 'lexis',
      severity: 'minor',
      msg: locale === 'es' ? 'Puedes matizar la afirmación inicial.' : 'Consider hedging the opening claim.',
      suggestion: locale === 'es' ? 'Parece que' : 'It seems that',
      replacement: locale === 'es' ? 'Parece que' : 'It seems that',
    });
  }
  if (spanLinker[1] > spanLinker[0]) {
    issues.push({
      span: spanLinker,
      category: 'cohesion',
      severity: 'major',
      msg: locale === 'es' ? 'Conector repetido.' : 'Repeated linker.',
      suggestion: locale === 'es' ? 'Además / asimismo' : 'Furthermore / additionally',
      replacement: locale === 'es' ? 'Además' : 'Furthermore',
    });
  }

  return {
    response_version: nowISODate(),
    locale,
    improved_text,
    rubric: rubricBase(level),
    checks: {
      word_count: { actual, target_min: min, target_max: max, ok: actual >= min && actual <= max },
      register: { level: 'formal', violations: [] },
      linkers: { range: locale === 'es' ? ['además','no obstante'] : ['moreover','however'], variety_ok: true },
      sentence_types: { simple: 1, compound: 1, complex: 2, compound_complex: 0 },
      cohesion: { issues: [], repetitions: [] },
      c2_synthesis: c2Synth,
    },
    band_estimate: { level, band: level === 'B2' ? 3 : level === 'C1' ? 4 : 4, range: [level === 'B2' ? 3 : 4, level === 'C2' ? 5 : 5] },
    examiner_comment:
      locale === 'es'
        ? 'Buena organización y registro. Añade una breve contraargumentación para fortalecer el equilibrio.'
        : 'Good organisation and register. Add a brief counter-argument to balance the stance.',
    task_alignment: (() => {
      if (level === 'C2' && type === 'essay') {
        const present = !!(task?.sourceA || task?.sourceB);
        return { prompt_covered: true, c2_sources: { present, summary_of_A: !!task?.sourceA, summary_of_B: !!task?.sourceB, integration: !!(task?.sourceA && task?.sourceB), evaluation: !!(task?.sourceA && task?.sourceB), verbatim_overlap_pct: 0 } };
      }
      if ((level === 'B2' || level === 'C1') && type === 'essay' && Array.isArray(task?.bullets)) {
        const bullets = task.bullets.slice(0, 3).map((b, i) => ({
          text: b,
          covered: i < 2,
          evidence: i < 2 ? ['para1'] : [],
        }));
        return { prompt_covered: true, bullets };
      }
      return { prompt_covered: true };
    })(),
    paragraph_feedback: [
      { index: 1, summary: locale === 'es' ? 'Tesis clara; atenúa absolutos.' : 'Clear thesis; temper absolutes.', actions: [locale === 'es' ? 'Añade “en muchos casos”.' : 'Add “in many cases”.'] },
      { index: 2, summary: locale === 'es' ? 'Concesión útil; concreta costes.' : 'Useful concession; make costs concrete.', actions: [locale === 'es' ? 'Incluye un ejemplo o dato.' : 'Include one example or data point.'] },
    ],
    lexis_targets: [
      { type: 'hedging', examples: locale === 'es' ? ['parece que','en muchos casos','tiende a'] : ['it seems that','in many cases','tends to'] },
    ],
    issues,
    coach_notes: locale === 'es'
      ? ['Añade una contraargumentación breve en el párrafo 2.', 'Evita intensificadores genéricos.']
      : ['Add a brief counter-argument in paragraph 2.', 'Avoid generic intensifiers.'],
    trace_id: Math.random().toString(36).slice(2),
    latency_ms: Math.floor(50 + Math.random() * 40),
    credits_used: 1,
  };
}

// ── API routes ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/correct', async (req, res) => {
  const err = basicValidate(req.body);
  if (err) return res.status(400).json({ error: 'invalid_request', message: err });

  try {
    const fixtureName = (req.get('x-ec-fixture') || req.query.fixture || '').toString().trim();
    if (fixtureName) {
      const f = await loadFixture(fixtureName);
      if (f.improved_text) f.improved_text = sanitize(f.improved_text);
      f.response_version = nowISODate();
      return res.json(f);
    }

    const payload = buildSyntheticResponse(req.body);
    return res.json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: 'Unexpected error. Please retry.' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`EssayCoach mock API running on http://localhost:${PORT}`);
  console.log(`GET  http://localhost:${PORT}/api/health`);
  console.log(`POST http://localhost:${PORT}/api/correct`);
});
