import { expectTypeOf, test } from "vitest";
import * as z from "zod";

const coreFieldsValidator = z.object({
  name: z.string(),
  nodeId: z.string(),
});

const stateValidator1 = z.discriminatedUnion("kind", [
  coreFieldsValidator.extend({
    kind: z.literal("file"),
    r2Key: z.string(),
  }),
  coreFieldsValidator.extend({
    kind: z.literal("folder"),
    viewMode: z.enum(["list", "grid"]),
  }),
]);

type State1 = z.infer<typeof stateValidator1>;

const stateValidator2 = z.intersection(
  z.object({
    name: z.string(),
    nodeId: z.string(),
  }),
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("file"),
      r2Key: z.string(),
    }),
    z.object({
      kind: z.literal("folder"),
      viewMode: z.enum(["list", "grid"]),
    }),
  ]),
);

type State2 = z.infer<typeof stateValidator2>;

test("State types are equivalent", () => {
  expectTypeOf<State1>().toExtend<State2>();
  expectTypeOf<State2>().toExtend<State1>();
});

test("State1 discriminates based on kind", () => {
  expectTypeOf<Extract<State1, { kind: "file" }>>().toHaveProperty("r2Key");
  expectTypeOf<Extract<State1, { kind: "file" }>>().not.toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State1, { kind: "folder" }>>().toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State1, { kind: "folder" }>>().not.toHaveProperty(
    "r2Key",
  );
});

test("State2 discriminates based on kind", () => {
  expectTypeOf<Extract<State2, { kind: "file" }>>().toHaveProperty("r2Key");
  expectTypeOf<Extract<State2, { kind: "file" }>>().not.toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State2, { kind: "folder" }>>().toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State2, { kind: "folder" }>>().not.toHaveProperty(
    "r2Key",
  );
});
