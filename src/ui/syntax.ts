/**
 * Lightweight syntax highlighting for diary code plates — zero dependencies.
 *
 * Per-line tokenizers for the languages the vault actually stores (html/xml,
 * css, js/ts, json, python, markdown). It is a cosmetic preview highlighter:
 * per-line and heuristic, not a parser — good enough to read like a real
 * editor at a glance, never used for anything semantic.
 */

export interface Tok {
  text: string;
  color: string;
}

const C = {
  comment: '#5b6b84',
  tag: '#6fc2b4',
  attr: '#f2c178',
  str: '#9fd8a8',
  num: '#c792ea',
  kw: '#7fc4e8',
  key: '#6fc2b4',
  sel: '#f2c178',
  prop: '#7fc4e8',
  fn: '#82aaff',
  punct: '#8b9bb4',
  plain: '#cbd5e1',
};

const JS_KEYWORDS = new Set(
  ('const let var function return if else for while class new import from export default async await try catch ' +
    'finally throw typeof instanceof this extends super switch case break continue do in of delete void yield ' +
    'static get set null undefined true false interface type enum implements public private protected readonly').split(' '),
);

const PY_KEYWORDS = new Set(
  ('def class return if elif else for while import from as with try except finally raise lambda None True False ' +
    'and or not in is pass break continue global nonlocal yield async await assert del').split(' '),
);

function pushPlain(out: Tok[], line: string, from: number, to: number) {
  if (to > from) out.push({ text: line.slice(from, to), color: C.plain });
}

function tokenizeWith(
  line: string,
  re: RegExp,
  classify: (m: RegExpExecArray) => Tok[],
): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) pushPlain(out, line, last, m.index);
    out.push(...classify(m));
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex += 1;
  }
  pushPlain(out, line, last, line.length);
  return out;
}

const tok = (text: string, color: string): Tok => ({ text, color });

function htmlLine(line: string): Tok[] {
  return tokenizeWith(
    line,
    /(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)|(<\/?)([a-zA-Z][\w-]*)|([a-zA-Z-]+)(?==)|("[^"]*"|'[^']*')|(\/?>)/gi,
    (m) => {
      if (m[1]) return [tok(m[1], C.comment)];
      if (m[2] !== undefined) return [tok(m[2], C.punct), tok(m[3] ?? '', C.tag)];
      if (m[4]) return [tok(m[4], C.attr)];
      if (m[5]) return [tok(m[5], C.str)];
      if (m[6]) return [tok(m[6], C.punct)];
      return [tok(m[0], C.plain)];
    },
  );
}

function cssLine(line: string): Tok[] {
  return tokenizeWith(
    line,
    /(\/\*[\s\S]*?\*\/)|(@[\w-]+)|("([^"\\]|\\.)*"|'([^'\\]|\\.)*')|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\b)|([a-zA-Z-]+)(?=\s*:)|([.#]?-?[A-Za-z_][\w-]*(?=[^{}]*\{))/g,
    (m) => {
      if (m[1]) return [tok(m[1], C.comment)];
      if (m[2]) return [tok(m[2], C.kw)];
      if (m[3]) return [tok(m[3], C.str)];
      if (m[5]) return [tok(m[5], C.num)];
      if (m[6]) return [tok(m[6], C.num)];
      if (m[7]) return [tok(m[7], C.prop)];
      if (m[8]) return [tok(m[8], C.sel)];
      return [tok(m[0], C.plain)];
    },
  );
}

function jsLine(line: string): Tok[] {
  return tokenizeWith(
    line,
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_$][\w$]*)(?=\s*\()|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g,
    (m) => {
      if (m[1]) return [tok(m[1], C.comment)];
      if (m[2]) return [tok(m[2], C.str)];
      if (m[3]) return [tok(m[3], C.fn)];
      if (m[4]) return [tok(m[4], C.num)];
      if (m[5]) return [tok(m[5], JS_KEYWORDS.has(m[5]) ? C.kw : C.plain)];
      return [tok(m[0], C.plain)];
    },
  );
}

function jsonLine(line: string): Tok[] {
  return tokenizeWith(
    line,
    /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|(true|false|null)/g,
    (m) => {
      if (m[1]) return m[2] ? [tok(m[1], C.key), tok(m[2], C.punct)] : [tok(m[1], C.str)];
      if (m[3]) return [tok(m[3], C.num)];
      if (m[4]) return [tok(m[4], C.kw)];
      return [tok(m[0], C.plain)];
    },
  );
}

function pyLine(line: string): Tok[] {
  return tokenizeWith(
    line,
    /(#[^"']*$\/)|("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(@[\w.]+)|([A-Za-z_]\w*)(?=\s*\()|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g,
    (m) => {
      if (m[1]) return [tok(m[1], C.comment)];
      if (m[2]) return [tok(m[2], C.str)];
      if (m[3]) return [tok(m[3], C.attr)];
      if (m[4]) return [tok(m[4], C.fn)];
      if (m[5]) return [tok(m[5], C.num)];
      if (m[6]) return [tok(m[6], PY_KEYWORDS.has(m[6]) ? C.kw : C.plain)];
      return [tok(m[0], C.plain)];
    },
  );
}

function mdLine(line: string): Tok[] {
  const out: Tok[] = [];
  const h = /^(#{1,6}\s+.*?)(#.*)?$/.exec(line);
  if (/^\s{0,3}#{1,6}\s/.test(line)) {
    out.push(tok(line, C.tag));
    return out;
  }
  if (/^\s{0,3}(```|[-*+]\s|\d+\.\s|>\s)/.test(line)) {
    out.push(tok(line, C.kw));
    return out;
  }
  return tokenizeWith(
    line,
    /(`[^`]*`)|(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)|(\[[^\]]*\]\([^)]*\))/g,
    (m) => {
      if (m[1]) return [tok(m[1], C.str)];
      if (m[2]) return [tok(m[2], C.attr)];
      if (m[3]) return [tok(m[3], C.fn)];
      return [tok(m[0], C.plain)];
    },
  );
}

export function langOf(ext?: string): string {
  switch ((ext ?? '').toLowerCase()) {
    case 'html': case 'htm': case 'xml': case 'svg': case 'vue': return 'html';
    case 'css': case 'scss': case 'sass': case 'less': return 'css';
    case 'js': case 'jsx': case 'mjs': case 'cjs': case 'ts': case 'tsx': return 'js';
    case 'json': case 'jsonc': case 'env': case 'toml': return 'json';
    case 'py': return 'python';
    case 'md': case 'markdown': return 'md';
    default: return 'plain';
  }
}

/** Highlight one line. Falls back to plain text for unknown languages. */
export function highlightLine(line: string, lang: string): Tok[] {
  try {
    switch (lang) {
      case 'html': return htmlLine(line);
      case 'css': return cssLine(line);
      case 'js': return jsLine(line);
      case 'json': return jsonLine(line);
      case 'python': return pyLine(line);
      case 'md': return mdLine(line);
      default: return [{ text: line, color: C.plain }];
    }
  } catch {
    return [{ text: line, color: C.plain }];
  }
}

export const SYNTAX_COLORS = C;
