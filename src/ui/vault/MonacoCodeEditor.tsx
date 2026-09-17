/**
 * MonacoCodeEditor — the REAL editor (VS Code's engine) for the Vault's
 * code studio. Loaded lazily: this module (and the whole Monaco chunk) is
 * only fetched the first time a code file is opened.
 *
 * The parent keeps full control: value flows in via `value`, edits flow out
 * via `onChange`; FIND / WRAP / FORMAT toolbar actions reach the editor
 * through the ref handle.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ensureMonaco, languageOf } from './monacoSetup';

const ReactMonaco = lazy(() => import('@monaco-editor/react'));

export interface MonacoHandle {
  find: () => void;
  setWordWrap: (on: boolean) => void;
  format: () => void;
  focus: () => void;
}

export function MonacoCodeEditor({
  value,
  fileName,
  wordWrap,
  onChange,
  onMountHandle,
}: {
  value: string;
  fileName: string;
  wordWrap: boolean;
  onChange: (v: string) => void;
  onMountHandle?: (handle: MonacoHandle) => void;
}) {
  const editorRef = useRef<{ getAction: (id: string) => { run: () => void } | null; updateOptions: (o: Record<string, unknown>) => void; focus: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const ext = fileName.includes('.') ? fileName.split('.').pop() ?? '' : '';
  const language = languageOf(ext);

  useEffect(() => {
    ensureMonaco();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !editorRef.current) return;
    onMountHandle?.({
      find: () => editorRef.current?.getAction('actions.find')?.run(),
      setWordWrap: (on: boolean) => editorRef.current?.updateOptions({ wordWrap: on ? 'on' : 'off' }),
      format: () => { void editorRef.current?.getAction('editor.action.formatDocument')?.run(); },
      focus: () => editorRef.current?.focus(),
    });
  }, [ready, onMountHandle]);

  if (!ready) return null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-slate-dim tracking-[0.2em] uppercase animate-pulse">
          summoning the code engine…
        </div>
      }
    >
      <ReactMonaco
        height="100%"
        theme="eventide"
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        beforeMount={(monacoInstance) => {
          /* define the theme at the last guaranteed-before-render moment */
          try {
            monacoInstance.editor.defineTheme('eventide', {
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
          } catch { /* already defined by monacoSetup */ }
        }}
        onMount={(editor) => {
          editorRef.current = editor as unknown as typeof editorRef.current;
          onMountHandle?.({
            find: () => editorRef.current?.getAction('actions.find')?.run(),
            setWordWrap: (on: boolean) => editorRef.current?.updateOptions({ wordWrap: on ? 'on' : 'off' }),
            format: () => { void editorRef.current?.getAction('editor.action.formatDocument')?.run(); },
            focus: () => editorRef.current?.focus(),
          });
        }}
        options={{
          fontFamily: '"Space Mono", ui-monospace, monospace',
          fontSize: 12.5,
          fontLigatures: false,
          minimap: { enabled: true, size: 'proportional', scale: 1 },
          wordWrap: wordWrap ? 'on' : 'off',
          lineNumbers: 'on',
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: 'phase',
          cursorSmoothCaretAnimation: 'on',
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'all',
          padding: { top: 10, bottom: 24 },
          scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
          overviewRulerBorder: false,
          stickyScroll: { enabled: false },
          guides: { indentation: true, bracketPairs: true },
          quickSuggestions: { other: true, comments: false, strings: false },
          matchBrackets: 'always',
          find: { addExtraSpaceOnTop: false },
        }}
      />
    </Suspense>
  );
}

export default MonacoCodeEditor;
