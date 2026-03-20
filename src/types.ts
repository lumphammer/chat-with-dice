import type { ROOM_TYPES } from "#/constants";
import { z } from "zod";

export type RoomType = (typeof ROOM_TYPES)[number];

type RollDefBase<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny> = {
  formulaValidator: TReq;
  resultValidator: TRes;
  // Always required — even retired roll types need to display old results
  ResultDisplay: React.ComponentType<{
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
  InputUI: React.ComponentType<{ onChange: (request: z.infer<TReq>) => void }>;
  handler: (request: z.infer<TReq>) => z.infer<TRes>;
};

export type RollDef<
  TReq extends z.ZodTypeAny = z.ZodTypeAny,
  TRes extends z.ZodTypeAny = z.ZodTypeAny,
> = RollDefWithoutUI<TReq, TRes> | RollDefWithUI<TReq, TRes>;
