import { isAlphanumeric, toAlphanumeric } from "./alphanumeric";
import { describe, expect, it } from "vitest";

describe("isAlphanumeric", () => {
  it("should return true for alphanumeric strings", () => {
    expect(isAlphanumeric("HelloWorld33")).toBe(true);
  });

  it("should return false for strings containing spaces", () => {
    expect(isAlphanumeric("Hello World 33")).toBe(false);
  });

  it("should return false for strings containing special characters", () => {
    expect(isAlphanumeric("Hello,World!33")).toBe(false);
  });
});

describe("toAlphanumeric", () => {
  it("should convert a string to alphanumeric", () => {
    expect(toAlphanumeric("HelloWorld33")).toBe("HelloWorld33");
  });

  it("should throw an error for strings containing spaces", () => {
    expect(() => toAlphanumeric("Hello World 33")).toThrow();
  });

  it("should throw an error for strings containing special characters", () => {
    expect(() => toAlphanumeric("Hello,World!33")).toThrow();
  });
});
