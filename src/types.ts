import type { ROLL_TYPES, ROOM_TYPES } from "#/constants";
import { z } from "zod";

export type RoomType = (typeof ROOM_TYPES)[number];

export type RollType = (typeof ROLL_TYPES)[number];

type RollDefBase<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny> = {
  requestValidator: TReq;
  resultValidator: TRes;
  // Always required — even retired roll types need to display old results
  resultDisplay: React.ComponentType<{
    formula: z.infer<TReq>;
    result: z.infer<TRes>;
  }>;
};

// Display-only (or retired): no input form, no handler
type RollDefWithoutUI<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
> = RollDefBase<TReq, TRes> & {
  inputUI?: never;
  handler?: never;
};

// Full experience: input, display, and handler all travel together
type RollDefWithUI<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
> = RollDefBase<TReq, TRes> & {
  inputUI: React.ComponentType<{ onSubmit: (request: z.infer<TReq>) => void }>;
  handler: (request: z.infer<TReq>) => z.infer<TRes>;
};

export type RollDef<
  TReq extends z.ZodTypeAny = z.ZodTypeAny,
  TRes extends z.ZodTypeAny = z.ZodTypeAny,
> = RollDefWithoutUI<TReq, TRes> | RollDefWithUI<TReq, TRes>;

export function defineRoll<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
>(def: RollDef<TReq, TRes>): RollDef<TReq, TRes> {
  return def;
}

export const rollRegistry = {
  standard: defineRoll({ requestValidator: ..., resultValidator: ... }),
  f20:      defineRoll({ requestValidator: ..., resultValidator: ..., inputUI: F20Input, resultDisplay: F20Result, handler: f20Handler }),
  formula:  defineRoll({ ... }),
  havoc:    defineRoll({ ... }),
  fitd:     defineRoll({ ... }),
} satisfies Record<RollType, RollDef>;
