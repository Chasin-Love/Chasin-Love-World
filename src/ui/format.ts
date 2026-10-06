/**
 * Minimal pretty-printer for diary code plates (zero deps).
 * Purpose: minified single-line files (common for html/css/js/json saves)
 * should READ like a real editor shows them. Cosmetic — formatting is only
 * applied for display or on an explicit user action, never silently to the
 * stored source.
 */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

function formatHtml(src: string): string {
  const tokens = src
    .replace(/>\s+</g, '><')
    .split(/(<[^>]+>)/g)
    .filter((s) => s.trim().length > 0);
  let depth = 0;
  const out: string[] = [];
  for (const tk of tokens) {
    if (!tk.startsWith('<')) {
      out.push('  '.repeat(depth) + tk.trim());
      continue;
    }
    const name = tk.toLowerCase().match(/^<\/?([\w-]+)/)?.[1] ?? '';
    const isClosing = /^<\//.test(tk);
    const isVoid = VOID_TAGS.has(name) || /\/>$/.test(tk) || /^<!/.test(tk);
    if (isClosing) depth = Math.max(0, depth - 1);
    out.push('  '.repeat(depth) + tk.trim());
    if (!isClosing && !isVoid) depth += 1;
  }
  return out.join('\n');
}

function formatCss(src: string): string {
  let depth = 0;
  let cur = '';
  const out: string[] = [];
  const flush = () => {
    const t = cur.trim();
    if (t) out.push('  '.repeat(depth) + t);
    cur = '';
  };
  for (const ch of src) {
    if (ch === '{') {
      const t = cur.trim();
      out.push('  '.repeat(depth) + (t ? `${t} {` : '{'));
      cur = '';
      depth += 1;
    } else if (ch === '}') {
      flush();
      depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + '}');
    } else if (ch === ';') {
      cur += ';';
      flush();
    } else {
      cur += ch;
    }
  }
  flush();
  return out.join('\n');
}

/** Conservative brace/semicolon formatter — string-aware, leaves the rest. */
function formatBraces(src: string): string {
  let depth = 0;
  let cur = '';
  let quote: string | null = null;
  const out: string[] = [];
  const flush = () => {
    const t = cur.trim();
    if (t) out.push('  '.repeat(Math.max(0, depth)) + t);
    cur = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      cur += ch;
      if (ch === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '{') {
      const t = cur.trim();
      out.push('  '.repeat(depth) + (t ? `${t} {` : '{'));
      cur = '';
      depth += 1;
    } else if (ch === '}') {
      flush();
      depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + '}');
    } else if (ch === ';') {
      cur += ';';
      flush();
    } else {
      cur += ch;
    }
  }
  flush();
  return out.join('\n');
}

/** Pretty-print for display/editing. Returns the original on any doubt. */
export function prettyPrint(text: string, lang: string): string {
  try {
    if (lang === 'json') {
      return JSON.stringify(JSON.parse(text), null, 2);
    }
    if (lang === 'html') return formatHtml(text);
    if (lang === 'css') return formatCss(text);
    if (lang === 'js') return formatBraces(text);
  } catch {
    return text;
  }
  return text;
}

/** True when the snippet looks minified (a line so long it needs formatting). */
export function looksMinified(text: string): boolean {
  return text.split('\n').some((l) => l.length > 200);
}
