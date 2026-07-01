// oxlint-disable no-magic-numbers
import { bench } from "@ark/attest";
import * as z from "zod";

// Benchmarks the *type-level* cost (TypeScript instantiation count) of two ways
// of writing a discriminated union that shares common fields across variants.
//
// The whole validator is constructed inside each bench body so the type work
// happens fresh every run — referencing an already-resolved type alias would
// measure nothing. `.types()` writes the measured count back into this file as
// a snapshot, so after the first run you can diff the two numbers directly.
//
// Run with: pnpm bench:types

bench("discriminatedUnion + extend", () => {
  const core = z.object({ name: z.string(), nodeId: z.string() });
  const v = z.discriminatedUnion("kind", [
    core.extend({ kind: z.literal("file"), r2Key: z.string() }),
    core.extend({
      kind: z.literal("folder"),
      viewMode: z.enum(["list", "grid"]),
    }),
  ]);
  return {} as z.infer<typeof v>;
}).types([2359, "instantiations"]);

bench("intersection of object + discriminatedUnion", () => {
  const v = z.intersection(
    z.object({ name: z.string(), nodeId: z.string() }),
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("file"), r2Key: z.string() }),
      z.object({
        kind: z.literal("folder"),
        viewMode: z.enum(["list", "grid"]),
      }),
    ]),
  );
  return {} as z.infer<typeof v>;
}).types([1923, "instantiations"]);
