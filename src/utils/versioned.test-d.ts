import { versioned } from "#/utils/versioned.ts";
import { expectTypeOf, test } from "vitest";
import * as z from "zod/v4";

// Three toy versions, each adding/renaming a field, to exercise the chain.
const v1 = z.object({ n: z.number() });
const v2 = z.object({
  version: z.literal("v2"),
  n: z.number(),
  label: z.string(),
});
const v3 = z.object({
  version: z.literal("v3"),
  n: z.number(),
  label: z.string(),
  tags: z.array(z.string()),
});

const m1to2 = (a: z.infer<typeof v1>): z.infer<typeof v2> => ({
  version: "v2",
  n: a.n,
  label: "",
});
const m2to3 = (a: z.infer<typeof v2>): z.infer<typeof v3> => ({
  ...a,
  version: "v3",
  tags: [],
});

test("output type is the latest version's output", () => {
  const validator = versioned(v1).then(v2, m1to2).then(v3, m2to3).build();
  expectTypeOf<z.output<typeof validator>>().toEqualTypeOf<
    z.infer<typeof v3>
  >();
});

test("a single version with no migrations is allowed", () => {
  const validator = versioned(v3).build();
  expectTypeOf<z.output<typeof validator>>().toEqualTypeOf<
    z.infer<typeof v3>
  >();
});

test("a migration whose output does not match the next validator is rejected", () => {
  const badMigration = (_a: z.infer<typeof v1>): { wrong: true } => ({
    wrong: true,
  });
  // @ts-expect-error migrate must return v2's output, not { wrong: true }
  versioned(v1).then(v2, badMigration);
});

test("a migration whose input does not match the current version is rejected", () => {
  const badInput = (a: { totallyUnrelated: string }): z.infer<typeof v2> => ({
    version: "v2",
    n: 0,
    label: a.totallyUnrelated,
  });
  // @ts-expect-error migrate must accept v1's output
  versioned(v1).then(v2, badInput);
});
