import { extractPreviewUrl } from "./extractPreviewUrl";
import { describe, expect, test } from "vitest";

describe("extractPreviewUrl", () => {
  test("extracts the first public https URL", () => {
    expect(
      extractPreviewUrl("Read https://example.com/post and https://later.test")
        ?.href,
    ).toBe("https://example.com/post");
  });

  test("extracts URLs from markdown links", () => {
    expect(
      extractPreviewUrl("[read this](https://example.com/post)")?.href,
    ).toBe("https://example.com/post");
  });

  test("does not preview angle-bracket autolinks", () => {
    expect(extractPreviewUrl("<https://example.com/post>")).toBeNull();
  });

  test("continues past a suppressed URL to the next eligible URL", () => {
    expect(
      extractPreviewUrl("<https://first.example> https://second.example")?.href,
    ).toBe("https://second.example/");
  });

  test("rejects non-https URLs and obvious local targets", () => {
    expect(extractPreviewUrl("http://example.com")).toBeNull();
    expect(extractPreviewUrl("https://localhost/admin")).toBeNull();
    expect(extractPreviewUrl("https://127.0.0.1/admin")).toBeNull();
    expect(extractPreviewUrl("https://192.168.0.1/admin")).toBeNull();
  });

  test("rejects URLs with embedded credentials", () => {
    expect(extractPreviewUrl("https://user:pass@example.com")).toBeNull();
  });
});
