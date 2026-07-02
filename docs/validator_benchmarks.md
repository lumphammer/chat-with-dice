# Benchmarking validators: zod vs ArkType, and how to write a discriminated union

## What this was

While working on the files capability I had two ways of writing the same
validator — a discriminated union whose variants share some common fields — and
wanted to know which was "better". That question turned out to have three
separate answers depending on what you measure, so I benchmarked it properly
before deciding. This doc records the findings so we don't have to re-run the
experiment to remember the conclusion. The benchmark files themselves have been
deleted; they were a one-off.

The two shapes, in zod:

```ts
// A: discriminated union with the common fields folded into each branch via .extend()
const core = z.object({ name: z.string(), nodeId: z.string() });
z.discriminatedUnion("kind", [
  core.extend({ kind: z.literal("file"), r2Key: z.string() }),
  core.extend({
    kind: z.literal("folder"),
    viewMode: z.enum(["list", "grid"]),
  }),
]);

// B: intersection of a common object with a bare discriminated union
z.intersection(
  z.object({ name: z.string(), nodeId: z.string() }),
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("file"), r2Key: z.string() }),
    z.object({ kind: z.literal("folder"), viewMode: z.enum(["list", "grid"]) }),
  ]),
);
```

I also wrote ArkType equivalents of both, because ArkType has a reputation for
runtime speed and I was curious.

## How to benchmark types (this was the bit I didn't know how to do)

Wall-clock `tsc` timing is too noisy for a comparison this small — the two
shapes differ by a few hundred type instantiations while zod itself contributes
thousands, so stopwatch variance swamps the signal. The right tool is
[`@ark/attest`](https://github.com/arktypeio/arktype/tree/main/ark/attest) (from
the ArkType folks). Its `bench(...).types()` counts the **number of type
instantiations** TypeScript performs for an expression — a deterministic number
that reruns identically. The same tool's `bench(...).mean()` measures **runtime**
per-call time, so both axes live in one harness.

Two gotchas worth remembering if we ever redo this:

- For a type benchmark, build the whole validator **inside** the bench body and
  return `{} as <inferred type>`. Referencing an already-resolved type alias
  measures nothing, because the instantiation work has already happened.
- attest bench files are just executed directly (`tsx file.bench.ts`), not run
  through a special CLI subcommand.

## Results

### Type-checking cost — instantiations, lower = cheaper to compile

| Shape                      | zod       | ArkType |
| -------------------------- | --------- | ------- |
| union / inlined-common (A) | 2 359     | 9 964   |
| intersection (B)           | **1 923** | 11 461  |

### Runtime cost — nanoseconds per parse, lower = faster

| Shape          | zod (file / folder) | ArkType (file / folder) |
| -------------- | ------------------- | ----------------------- |
| union / extend | ~110 / ~135 ns      | **~5 ns**               |
| intersection   | ~560–750 ns         | **~5 ns**               |

(Runtime figures are indicative and machine-dependent; treat the orders of
magnitude as the signal, not the exact nanoseconds. The instantiation counts,
by contrast, are deterministic.)

## What we learned

**The compile-vs-runtime trade-off flips depending on engine.**

- In **zod**, the intersection (B) is _cheaper to type-check_ but roughly **5×
  slower to parse**. That's because `z.intersection` stays a live combinator: it
  runs both schemas on every parse and deep-merges their outputs. Shape A folds
  the common fields into each branch and parses in a single pass.
- In **ArkType**, the union (A) is the cheaper one to type-check, and the
  intersection carries **no runtime penalty** — both parse identically (~5 ns).
  ArkType's `.and()` computes the _reduced_ intersection at definition time, so
  the two shapes converge to the exact same flat validator.

**Cross-engine:** ArkType is ~4–6× _more_ expensive to type-check (its
string-DSL parsing is heavy at the type level) but 20×–140× faster at runtime,
because it compiles each validator down to a specialised, monomorphic JS
function instead of walking a schema-object tree per call.

## Decision: stick with zod

Despite ArkType's runtime dominance, we're staying on zod. The reasoning:

1. **Parse throughput is a non-factor at our scale.** Even a very busy chatroom
   processing large action payloads at ~1/second would accumulate, at most, a
   few seconds of validator compute across a whole day. We're optimising
   nanoseconds we don't spend.
2. **Startup / construction cost matters more for us, and likely favours zod.**
   Our real concern is validator _construction_ time — the work done at module
   load, which hits slow client machines on page load and our Durable Objects on
   cold start. ArkType buys its parse speed precisely by doing more work up front
   at construction, so on the axis we actually care about it would probably be
   _worse_. (Note: we benchmarked type-check cost and parse cost, but not
   construction cost — if this ever becomes pressing, that's the benchmark to
   add.)
3. **One syntax.** Astro uses zod for Astro action validation, so staying on zod
   keeps a single validator dialect across the codebase.

### Consequence for how we write these unions in zod

Prefer shape **A** (`discriminatedUnion` + `.extend()`) over shape B
(`z.intersection`). The ~400-instantiation type saving from B is negligible,
while A is ~5× faster to parse and — more importantly — produces a single flat
schema rather than a two-schema merge. Reserve `z.intersection` for cases where
you genuinely can't restructure into one discriminated union.
