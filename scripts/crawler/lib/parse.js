/** Minimal HTML helpers — keeps the crawler dependency-free (no cheerio/axios). */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', ndash: '–', mdash: '—',
};

function decodeEntities(str = '') {
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Strip tags → plain text, with <br> and block ends becoming newlines. */
function toText(html = '', { keepLines = false } = {}) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--[\s\S]*$/, '') // unbalanced comment opener left by the source markup
    .replace(/-->/g, '');
  s = keepLines
    ? s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|tr|h\d)>/gi, '\n')
    : s.replace(/<br\s*\/?>/gi, ' ');
  s = decodeEntities(s.replace(/<[^>]*>/g, ' '));
  s = s.replace(/ /g, ' ');
  return keepLines
    ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').split('\n').map((l) => l.trim()).join('\n').trim()
    : s.replace(/\s+/g, ' ').trim();
}

/** All matches of a global regex, returning capture group `group`. */
function matchAll(html, regex, group = 1) {
  return [...html.matchAll(regex)].map((m) => m[group]);
}

/** First capture group of `regex`, or '' when it does not match. */
function match1(html, regex, group = 1) {
  const m = html.match(regex);
  return m ? m[group] : '';
}

/** Normalises 2026.08.12 / 2026-8-2 / 20260812 to YYYY-MM-DD. Returns '' if unparseable. */
function toISODate(raw = '') {
  const s = String(raw).trim();
  let m = s.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return '';
  const [, y, mo, d] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return Number.isNaN(new Date(iso).getTime()) ? '' : iso;
}

module.exports = { decodeEntities, toText, matchAll, match1, toISODate };
