/**
 * Monaco setup for the Vault code studio — fully local (offline-first).
 *
 * - Workers are bundled by Vite via `?worker` imports (no CDN, works in the
 *   Tauri desktop shell and the browser build alike).
 * - `loader.config({ monaco })` points @monaco-editor/react at THIS local
 *   monaco instance instead of its default jsdelivr CDN loader.
 * - Registers the "eventide" theme: the vault's own dark cosmic palette.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
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
