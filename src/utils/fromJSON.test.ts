import { fromJSON } from "./fromJSON";
import { describe, expect, test } from "vitest";
import { z } from "zod";

const personValidator = z.object({
  name: z.string(),
  age: z.int(),
});

const fromJSONPersonValidator = fromJSON(personValidator);

const fred: z.infer<typeof personValidator> = {
  name: "Fred",
  age: 50,
};

describe("fromJSON", () => {
  test("should error if handed an object, even if valid", () => {
    expect(() => {
      fromJSONPersonValidator.parse(fred);
    }).toThrow();
  });
  test("should parse a valid object inside a JSON string", () => {
    expect(fromJSONPersonValidator.parse(JSON.stringify(fred))).toMatchObject(
      fred,
    );
  });
  test("should error with input which is valid JSON but invalid data", () => {
    expect(() => {
      fromJSONPersonValidator.parse(
        JSON.stringify({ name: "Bob", hobbies: ["Fishing"] }),
      );
    }).toThrow();
  });
  test("should error with input which is not valid JSON", () => {
    expect(() => {
      fromJSONPersonValidator.parse("invalid");
    }).toThrow();
  });
});
