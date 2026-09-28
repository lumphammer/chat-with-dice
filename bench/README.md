# Render benchmarks

Measures what React does during common room actions with React Compiler on and off, so the effect of the compiler can be put into numbers.

```sh
node bench/run.ts --room <roomId>
```

This builds the app twice into `bench/.builds/{off,on}`, then for each variant starts `astro preview` against the local `.wrangler` state and drives a room with Playwright. Stop `pnpm dev` first: both would be using the same local Durable Objects.

The room must exist locally. For the `draw` scenario it needs the Cards capability with at least one deck shared into it. On the first run the room's history is topped up to 100 messages (the size of the catch-up buffer), so every load renders a full chat.

## Options

| flag                 | default | what it does                                                                                                                           |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--room`             |         | room id (required)                                                                                                                     |
| `--iterations`       | 5       | measured iterations per scenario, per round (after one warm-up)                                                                        |
| `--rounds`           | 2       | rounds per variant; the order alternates each round so drift doesn't favour one                                                        |
| `--cpu`              | 4       | Chrome CPU throttling factor                                                                                                           |
| `--scenarios`        | all     | comma-separated subset, e.g. `roll,draw`                                                                                               |
| `--skip-build`       |         | reuse the builds already in `bench/.builds`                                                                                            |
| `--flatpak <app id>` |         | drive a Flatpak browser (e.g. `org.chromium.Chromium`) over CDP instead of Playwright's own Chromium, for systems where that can't run |
| `--headed`           |         | show the browser                                                                                                                       |

Results are written to `bench/results/<timestamp>.{md,json}`. The markdown has medians; the JSON has every sample.

## What gets measured

Each scenario runs from the start of the action until React has not committed for 600ms.

- **commits**: React commits.
- **component renders**: components whose render function actually ran, not counting first mounts. This is the number the compiler should move, because its job is to let unchanged subtrees bail out.
- **React render ms**: total render-phase time across those commits, from React's profiling build.
- **script ms / main-thread task ms**: from Chrome's `Performance.getMetrics`, so they include everything on the main thread (Playwright's own polling, CSS animations, websocket handling), not just React.

Render counts come from posing as the React DevTools hook and walking each committed fiber tree (see `reactCommitRecorder.ts`). The benchmark builds use React's profiling build and skip minification, via `BENCH_PROFILING=1` in `astro.config.mjs`, so that durations are available and component names are readable. Both variants are built the same way, so the comparison is fair, but the absolute numbers are a little higher than in a real production build.
