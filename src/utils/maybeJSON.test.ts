import { maybeJSON } from "./maybeJSON";
import { describe, expect, test } from "vitest";
import { z } from "zod";

const personValidator = z.object({
  name: z.string(),
  age: z.int(),
});

const maybeJSONPersonValidator = maybeJSON(personValidator);

const fred: z.infer<typeof personValidator> = {
  name: "Fred",
  age: 50,
};

describe("maybeJSON", () => {
  test("should parse a valid object", () => {
    expect(maybeJSONPersonValidator.parse(fred)).toMatchObject(fred);
  });
  test("should parse a valid object inside a JSON string", () => {
    expect(maybeJSONPersonValidator.parse(JSON.stringify(fred))).toMatchObject(
      fred,
    );
  });
  test("should error with input which is valid JSON but invalid data", () => {
    expect(() => {
      maybeJSONPersonValidator.parse(
        JSON.stringify({ name: "Bob", hobbies: ["Fishing"] }),
      );
    }).toThrow();
  });
  test("should error with input which is not valid JSON", () => {
    expect(() => {
      maybeJSONPersonValidator.parse("invalid");
    }).toThrow();
  });
});
