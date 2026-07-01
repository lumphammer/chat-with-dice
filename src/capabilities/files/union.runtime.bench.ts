// oxlint-disable no-magic-numbers
import { bench } from "@ark/attest";
import * as z from "zod";

// Benchmarks the *runtime* cost (wall-clock per parse) of the two validator
// shapes. The validators are built once at module scope; only the `.parse()`
// call lives inside each bench body, so we measure parsing — not construction.
//
// Note the runtime/type trade-off: `z.intersection` runs BOTH schemas and
// merges their outputs on every parse, while `discriminatedUnion + extend`
// folds the common fields into each branch and parses in a single pass. The
// type-cheaper option is not necessarily the runtime-cheaper one.
//
// `.mean()` writes the measured per-call time back into this file as a
// baseline, exactly like `.types()` does for instantiation counts.
//
// Run with: pnpm bench:runtime

const validatorExtend = z.discriminatedUnion("kind", [
  z
    .object({ name: z.string(), nodeId: z.string() })
    .extend({ kind: z.literal("file"), r2Key: z.string() }),
  z
    .object({ name: z.string(), nodeId: z.string() })
    .extend({ kind: z.literal("folder"), viewMode: z.enum(["list", "grid"]) }),
]);

const validatorIntersection = z.intersection(
  z.object({ name: z.string(), nodeId: z.string() }),
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("file"), r2Key: z.string() }),
    z.object({
      kind: z.literal("folder"),
      viewMode: z.enum(["list", "grid"]),
    }),
  ]),
);

const fileInput = {
  name: "notes",
  nodeId: "n1",
  kind: "file",
  r2Key: "abc123",
};

const folderInput = {
  name: "docs",
  nodeId: "n2",
  kind: "folder",
  viewMode: "grid",
};

bench("discriminatedUnion + extend — parse file", () => {
  validatorExtend.parse(fileInput);
}).mean([99.08, "ns"]);

bench("discriminatedUnion + extend — parse folder", () => {
  validatorExtend.parse(folderInput);
}).mean([124.36, "ns"]);

bench("intersection — parse file", () => {
  validatorIntersection.parse(fileInput);
}).mean([563.03, "ns"]);

bench("intersection — parse folder", () => {
  validatorIntersection.parse(folderInput);
}).mean([571.26, "ns"]);
