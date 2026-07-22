# minirouter

An in-memory, URL-less router for building navigable, nested drill-down UIs
(think "mobile app screens") as a small piece of a larger page. It never touches
the browser history, so several independent routers can coexist.

This is a **port** of [`@lumphammer/minirouter`], adapted to this repo:

- **`Link` renders a `<button>`, not an `<a>`.** These controls navigate an
  in-memory router with no URL, so they are semantically buttons — which keeps
  the accessibility tree honest.
- **The framer-motion / emotion `animated` layer is dropped.** Transitions here
  are done with Tailwind/CSS instead. The outlet primitives (`useOutletProvider`,
  `useOutletRoute`) are kept so a coordinated-transition outlet can be built.
- Debug `DevTools` and the demo `Outlet` are omitted.

## Core concepts

- **Direction** — an identifier for a _way_ to navigate; carries no content.
  Create one with `createDirection`; add a type param for required params
  (`createDirection<string>("card")`).
- **Step** — a concrete navigation: a Direction plus its params. You make one by
  _calling_ a Direction (`card("abc")`).
- **`Router`** wraps the routed UI. **`Route`** renders its children when the
  current step matches its `direction`. **`Link`** navigates. **`useParams`**
  reads the current (or a parent) step's params, typed from the Direction.

See the upstream README for the full tour (deep linking via `to={[a(), b()]}`,
`from="root"`, `to="up"`, rolling your own animated route with `useRoute`).

[`@lumphammer/minirouter`]: https://github.com/lumphammer/investigator-fvtt/tree/main/packages/minirouter
