export namespace MaybeError {
  export type Success<T> = { result: "success"; data: T };
  export type Error = { result: "error"; message: string; statusCode: number };
}

export type MaybeError<T> = MaybeError.Success<T> | MaybeError.Error;

export type PromiseMaybeError<T> = Promise<MaybeError<T>>;

export const success = <T>(value: T): MaybeError.Success<T> => ({
  result: "success",
  data: value,
});

export const error = (
  message: string,
  statusCode: number,
  cause?: unknown,
): MaybeError.Error => ({
  result: "error",
  message: cause
    ? `${message} (Cause: ${cause instanceof Error ? cause.message : JSON.stringify(cause)})`
    : message,
  statusCode,
});

export const isSuccess = <T>(
  result: MaybeError<T>,
): result is MaybeError.Success<T> => result.result === "success";

export const isError = <T>(result: MaybeError<T>): result is MaybeError.Error =>
  result.result === "error";
