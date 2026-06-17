import * as z from "zod";

/**
 * A restricted type for JSON-serializable data which *must* be an object at the
 * top level.
 */
export type JsonData = {
  [key: string]: z.core.util.JSONType;
};

/**
 * A type for zod validators of JsonData
 * @see JsonData
 */
export type JsonValidator = z.ZodType<JsonData>;

/**
 * A zod validator for JSON objects.
 */
export const jsonObjectValidator = z.record(
  z.string(),
  z.json(),
) satisfies JsonValidator;
