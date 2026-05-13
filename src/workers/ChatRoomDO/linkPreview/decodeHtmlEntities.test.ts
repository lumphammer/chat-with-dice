import { decodeHtmlEntities } from "./decodeHtmlEntities";
import { describe, expect, test } from "vitest";

describe("decodeHtmlEntities", () => {
  test("decodes common named entities", () => {
    expect(
      decodeHtmlEntities("A &quot;quoted&quot; title &amp; description"),
    ).toBe('A "quoted" title & description');
  });

  test("decodes numeric entities", () => {
    expect(decodeHtmlEntities("A &#34;quote&#34; and &#x1F44D;")).toBe(
      'A "quote" and 👍',
    );
  });

  test("leaves unknown or invalid entities intact", () => {
    expect(decodeHtmlEntities("A &madeup; entity and &#xnot;")).toBe(
      "A &madeup; entity and &#xnot;",
    );
  });
});
