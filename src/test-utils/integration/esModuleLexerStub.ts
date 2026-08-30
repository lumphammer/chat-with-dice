/**
 * Stands in for `es-module-lexer` inside the integration (workers) project.
 *
 * As of Astro 7.2.6 the actions *runtime* entrypoint we alias `astro:actions`
 * to reaches Astro's *build-time* Vite plugin
 * (`dist/actions/vite-plugin-actions.js` -> `dist/actions/utils.js`), which
 * imports `es-module-lexer` at module scope. Merely loading that module starts a
 * `WebAssembly.compile()`, and workerd forbids compiling wasm at runtime — so
 * every integration test file ended in an unhandled rejection and the run
 * failed, with all 311 tests passing.
 *
 * The lexer only ever backs `isActionsFilePresent`, a build-time check that
 * nothing in the tests calls. `parse` throws rather than faking a result: if a
 * test ever does reach it, we want to hear about it rather than quietly get a
 * wrong answer.
 */

/** Astro awaits this before its first `parse`. */
export const init = Promise.resolve();

export function parse(): never {
  throw new Error(
    "es-module-lexer is stubbed in integration tests — see esModuleLexerStub.ts",
  );
}
