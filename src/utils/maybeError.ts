import { codeToStatusMap } from "./codeToStatusMap";
import { type ActionErrorCode } from "astro:actions";

type TPromise<T> = Promise<T>;

export namespace MaybeError {
  export type Success<T = undefined> = T extends undefined
    ? { kind: "success"; data?: undefined }
    : { kind: "success"; data: T };
  export type Error = {
    kind: "error";
    message: string;
    code: ActionErrorCode;
  };
  export type Promise<T> = TPromise<MaybeError<T>>;
}

export type MaybeError<T = undefined> =
  MaybeError.Success<T> | MaybeError.Error;
export type PromiseMaybeError<T = undefined> = Promise<MaybeError<T>>;

export function success(): MaybeError.Success;
export function success<T>(value: T): MaybeError.Success<T>;
export function success<T>(value?: T): MaybeError.Success<T> {
  return value === undefined
    ? ({ kind: "success" } as MaybeError.Success<T>)
    : ({ kind: "success", data: value } as MaybeError.Success<T>);
}

export const error = (
  message: string,
  code: ActionErrorCode,
  cause?: unknown,
): MaybeError.Error => ({
  kind: "error",
  message: cause
    ? `${message} (Cause: ${cause instanceof Error ? cause.message : JSON.stringify(cause)})`
    : message,
  code,
});

export const isError = <T>(result: MaybeError<T>): result is MaybeError.Error =>
  result.kind === "error";

export const errorToResponse = (errorObject: MaybeError.Error) => {
  return new Response(JSON.stringify({ error: errorObject.message }), {
    status: codeToStatusMap[errorObject.code],
  });
};
