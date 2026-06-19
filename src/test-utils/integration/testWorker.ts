/**
 * Minimal worker entry used by the vitest workers pool. The real production
 * entry (`src/workers/worker.ts`) pulls in `@astrojs/cloudflare/entrypoints/server`
 * which is an Astro build artifact that doesn't exist outside `astro build`.
 *
 * The pool needs `main:` to point at a script that exports our DO classes so
 * miniflare can register them and instantiate them in-process.
 *
 * `ChatRoomDO` is intentionally not re-exported here: its module graph reaches
 * `#/capabilities/capabilityRegistry`, which value-imports React sidebar
 * components and transitively `quikdown`, whose CJS/ESM interop blows up under
 * the workers pool's module loader. Add it (and a binding in vitest.config) the
 * first time a test actually needs it, then deal with whichever loader issue
 * surfaces.
 */
export { UserDataDO } from "#/workers/UserDataDO/UserDataDO";

export default {
  fetch() {
    return new Response("test-worker: HTTP routing is not wired in tests");
  },
};
