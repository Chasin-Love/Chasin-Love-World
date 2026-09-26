/**
 * Monaco setup for the Vault code studio — fully local (offline-first).
 *
 * - Workers are bundled by Vite via `?worker` imports (no CDN, works in the
 *   Tauri desktop shell and the browser build alike).
 * - `loader.config({ monaco })` points @monaco-editor/react at THIS local
 *   monaco instance instead of its default jsdelivr CDN loader.
 * - Registers the "eventide" theme: the vault's own dark cosmic palette.
 *
 * BUNDLE CONTRACT (R52 — the size fix): we do NOT import the `monaco-editor`
 * package root. That barrel (`esm/vs/index.js` → `editor.main.js`) statically
 * registers ALL 84 basic-language grammars and pulls the 138 kB
 * monaco-lsp-client — while `languageOf()` below can only ever produce 12
 * languages. That mismatch was ~2.3 MB of dead weight in the editor chunk.
 * Instead we import the core editor API plus exactly the contributions,
 * grammars and language services this editor uses. Every deep path here is
 * the same file the barrel itself imports — nothing is reimplemented.
 *
 * If you extend `languageOf()` with a new language, add its
 * `languages/definitions/<lang>/register.js` import to GRAMMARS below.
 */

/* ----------------------------- the core API ------------------------------
   editor.api.js = namespaces + standalone editor scaffolding, no languages,
   no contributions. This is the `monaco` object handed to the loader. */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { loader } from '@monaco-editor/react';

/* --------------------------- contributions -------------------------------
   Editor features, mirroring the option set in MonacoCodeEditor.tsx (find,
   format, folding, suggestions, hover, markers, multicursor, brackets…).
   Left out: diff editor, LSP quick-access/inspect/rename UI, GPU actions,
   iPad keyboard, codelens, inline completions, drag-and-drop — none are
   reachable from the vault editor. */
import 'monaco-editor/esm/vs/features/find/register.js';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js';
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js';
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import 'monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor.js';
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/wordPartOperations/browser/wordPartOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/browser/caretOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/browser/transpose.js';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js';
import 'monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation.js';
import 'monaco-editor/esm/vs/editor/contrib/inPlaceReplace/browser/inPlaceReplace.js';
import 'monaco-editor/esm/vs/editor/contrib/linkedEditing/browser/linkedEditing.js';
import 'monaco-editor/esm/vs/editor/contrib/links/browser/links.js';
import 'monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2.js';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestInlineCompletions.js';
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js';
import 'monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError.js';
import 'monaco-editor/esm/vs/editor/contrib/smartSelect/browser/smartSelect.js';
import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo.js';
import 'monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization.js';

/* ------------------------------ grammars --------------------------------
   Exactly the 12 ids `languageOf()` can return — basic tokenizers only,
   registered lazily per-language by monaco's own machinery. */
import 'monaco-editor/esm/vs/languages/definitions/css/register.js';
import 'monaco-editor/esm/vs/languages/definitions/scss/register.js';
import 'monaco-editor/esm/vs/languages/definitions/less/register.js';
import 'monaco-editor/esm/vs/languages/definitions/html/register.js';
import 'monaco-editor/esm/vs/languages/definitions/xml/register.js';
import 'monaco-editor/esm/vs/languages/definitions/javascript/register.js';
import 'monaco-editor/esm/vs/languages/definitions/typescript/register.js';
import 'monaco-editor/esm/vs/languages/definitions/markdown/register.js';
import 'monaco-editor/esm/vs/languages/definitions/python/register.js';
import 'monaco-editor/esm/vs/languages/definitions/sql/register.js';
import 'monaco-editor/esm/vs/languages/definitions/yaml/register.js';
import 'monaco-editor/esm/vs/languages/definitions/shell/register.js';

/* ------------------------- language services -----------------------------
   The real intellisense engines (JSON schema diagnostics, CSS/HTML
   validation, TS compiler) — the same four the worker map below serves. */
import 'monaco-editor/esm/vs/languages/features/json/register.js';
import 'monaco-editor/esm/vs/languages/features/css/register.js';
import 'monaco-editor/esm/vs/languages/features/html/register.js';
import 'monaco-editor/esm/vs/languages/features/typescript/register.js';

/* ------------------------------- workers -------------------------------- */
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json': return new jsonWorker();
      case 'css': case 'scss': case 'less': return new cssWorker();
      case 'html': case 'handlebars': case 'razor': return new htmlWorker();
      case 'typescript': case 'javascript': return new tsWorker();
      default: return new editorWorker();
    }
  },
};

let themeDefined = false;

function defineEventideTheme(): void {
  if (themeDefined) return;
  monaco.editor.defineTheme('eventide', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5b6b84', fontStyle: 'italic' },
      { token: 'string', foreground: '9fd8a8' },
      { token: 'keyword', foreground: '7fc4e8' },
      { token: 'number', foreground: 'c792ea' },
      { token: 'type', foreground: 'f2c178' },
      { token: 'tag', foreground: '6fc2b4' },
      { token: 'attribute.name', foreground: 'f2c178' },
      { token: 'attribute.value', foreground: '9fd8a8' },
      { token: 'delimiter', foreground: '8b9bb4' },
      { token: 'variable', foreground: 'cbd5e1' },
      { token: 'variable.predefined', foreground: '82aaff' },
      { token: 'function', foreground: '82aaff' },
      { token: 'metatag', foreground: 'e0785a' },
    ],
    colors: {
      'editor.background': '#070b16',
      'editor.foreground': '#cbd5e1',
      'editorLineNumber.foreground': '#3d4a63',
      'editorLineNumber.activeForeground': '#6fc2b4',
      'editor.selectionBackground': '#6fc2b43d',
      'editor.inactiveSelectionBackground': '#6fc2b41f',
      'editor.lineHighlightBackground': '#0d1424',
      'editorCursor.foreground': '#f2c178',
      'editorIndentGuide.background1': '#141c2f',
      'editorIndentGuide.activeBackground1': '#2a3a55',
      'editorWidget.background': '#0a101f',
      'editorWidget.border': '#1d2a42',
      'editorSuggestWidget.background': '#0a101f',
      'minimap.background': '#050810',
      'scrollbarSlider.background': '#3a4c7466',
      'scrollbarSlider.hoverBackground': '#3a4c7499',
    },
  });
  themeDefined = true;
}

export { monaco };
loader.config({ monaco });

/** Lazy loader guard — the editor chunk only initializes on first use. */
export function ensureMonaco(): void {
  defineEventideTheme();
}

export function languageOf(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'html': case 'htm': return 'html';
    case 'xml': case 'svg': return 'xml';
    case 'css': case 'scss': case 'less': return 'css';
    case 'js': case 'jsx': case 'mjs': case 'cjs': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'md': case 'markdown': return 'markdown';
    case 'py': return 'python';
    case 'sql': return 'sql';
    case 'yml': case 'yaml': return 'yaml';
    case 'sh': case 'bash': case 'zsh': return 'shell';
    default: return 'plaintext';
  }
}
