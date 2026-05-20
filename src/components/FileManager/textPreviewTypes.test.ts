import {
  TEXT_PREVIEW_SIZE_LIMIT_BYTES,
  isMarkdownPreviewable,
  isTextPreviewable,
} from "./textPreviewTypes";
import { describe, expect, test } from "vitest";

const ONE_MIB_BYTES = 1_048_576;

describe("text preview type detection", () => {
  test("detects markdown by MIME type", () => {
    expect(isMarkdownPreviewable("notes", "text/markdown")).toBe(true);
  });

  test("detects markdown by common extension when MIME type is missing", () => {
    expect(isMarkdownPreviewable("README.md", "application/octet-stream")).toBe(
      true,
    );
    expect(
      isMarkdownPreviewable("README.markdown", "application/octet-stream"),
    ).toBe(true);
  });

  test("detects text slash MIME types", () => {
    expect(isTextPreviewable("notes.txt", "text/plain")).toBe(true);
    expect(isTextPreviewable("style.css", "text/css; charset=utf-8")).toBe(
      true,
    );
  });

  test("detects common text-like application MIME types", () => {
    expect(isTextPreviewable("data.json", "application/json")).toBe(true);
    expect(isTextPreviewable("feed.xml", "application/atom+xml")).toBe(true);
    expect(isTextPreviewable("config.yaml", "application/x-yaml")).toBe(true);
    expect(isTextPreviewable("manifest", "application/manifest+json")).toBe(
      true,
    );
  });

  test("does not detect binary application MIME types", () => {
    expect(isTextPreviewable("archive.zip", "application/zip")).toBe(false);
    expect(isTextPreviewable("unknown.bin", "application/octet-stream")).toBe(
      false,
    );
  });

  test("uses one mebibyte preview size limit", () => {
    expect(TEXT_PREVIEW_SIZE_LIMIT_BYTES).toBe(ONE_MIB_BYTES);
  });
});
