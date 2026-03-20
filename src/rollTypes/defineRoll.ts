import type { RollDef } from "#/types";
import type { z } from "zod";

export function defineRoll<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
>(def: RollDef<TReq, TRes>): RollDef<TReq, TRes> {
  return def;
}
