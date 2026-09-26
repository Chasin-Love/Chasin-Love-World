/**
 * Type shim for the R52 curated-monaco bundle contract.
 *
 * `src/ui/vault/monacoSetup.ts` imports monaco-editor through deep `esm/`
 * paths (the package's exports map doesn't resolve those for TypeScript, so
 * each spec below is declared here). Two declarations:
 *
 * 1. The wildcard shorthand: every deep esm path is a side-effect import
 *    (grammar/contribution registration) — no runtime shape needed.
 * 2. `editor.api.js` gets the REAL monaco typings re-exported through the
 *    package root's types, so `monaco.editor.*` stays fully typed.
 *
 * The `?worker` imports are typed by vite/client (referenced from
 * src/engine/engine.ts) and are NOT redeclared here.
 */
declare module 'monaco-editor/esm/*';

declare module 'monaco-editor/esm/vs/editor/editor.api.js' {
  export * from 'monaco-editor';
}
