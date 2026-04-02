import { z } from "zod";

/**
 * A preprocessor that converts a string input to a JSON object if possible,
 * otherwise returns the original input.
 *
 * @param validator
 * @returns
 */
export const fromJSON = <TValidator extends z.ZodObject>(
  validator: TValidator,
) => {
  return z.preprocess((input) => {
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }
    return JSON.parse(input);
  }, validator);
};

// could also have implemented this is a straight transform, but then the caller
// would have to use it like `maybeJSON.pipe(...)`

// const maybeJSON = z.transform((input) => {
//   if (typeof input === "string") {
//     try {
//       return JSON.parse(input);
//     } catch (_) {
//       return input;
//     }
//   } else {
//     return input;
//   }
// });
