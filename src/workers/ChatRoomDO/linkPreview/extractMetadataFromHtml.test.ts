import {
  extractMetadataFromHtml,
  type CreateHtmlRewriter,
} from "./extractMetadataFromHtml";
import { describe, expect, test } from "vitest";

type FakeHandlers = {
  meta?: {
    element?: (element: { getAttribute(name: string): string | null }) => void;
  };
  title?: {
    text?: (text: { text: string }) => void;
  };
};

const createFakeHtmlRewriter: CreateHtmlRewriter = () => {
  const handlers: FakeHandlers = {};

  return {
    on(selector, handler) {
      if (selector === "meta" || selector === "title") {
        handlers[selector] = handler;
      }
      return this;
    },
    transform(response) {
      return new Response(
        new ReadableStream({
          async start(controller) {
            const html = await response.text();

            for (const match of html.matchAll(/<meta\s+([^>]+)>/gi)) {
              const attrs = match[1];
              handlers.meta?.element?.({
                getAttribute(name: string) {
                  const attrMatch = attrs.match(
                    new RegExp(`${name}=["']([^"']+)["']`, "i"),
                  );
                  return attrMatch?.[1] ?? null;
                },
              });
            }

            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
              handlers.title?.text?.({ text: titleMatch[1] });
            }

            controller.close();
          },
        }),
      );
    },
  };
};

describe("extractMetadataFromHtml", () => {
  test("extracts title and Open Graph metadata", async () => {
    await expect(
      extractMetadataFromHtml(
        `
          <html>
            <head>
              <title>Fallback title</title>
              <meta property="og:title" content="Open Graph title">
              <meta name="description" content="Plain description">
            </head>
          </html>
        `,
        createFakeHtmlRewriter,
      ),
    ).resolves.toEqual({
      title: "Fallback title",
      meta: {
        "og:title": "Open Graph title",
        description: "Plain description",
      },
    });
  });
});
