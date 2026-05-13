import { fetchLinkPreview } from "./fetchLinkPreview";
import { afterEach, describe, expect, test, vi } from "vitest";

const KIBIBYTE_BYTES = 1024;
const YOUTUBE_STYLE_PREFIX_KIBIBYTES = 650;

type FakeElementHandler = {
  element?: (element: { getAttribute(name: string): string | null }) => void;
};

type FakeTextHandler = {
  text?: (text: { text: string }) => void;
};

class FakeHtmlRewriter {
  private metaHandler?: FakeElementHandler;
  private titleHandler?: FakeTextHandler;

  on(selector: string, handler: FakeElementHandler | FakeTextHandler) {
    if (selector === "meta") {
      this.metaHandler = handler as FakeElementHandler;
    }
    if (selector === "title") {
      this.titleHandler = handler as FakeTextHandler;
    }
    return this;
  }

  transform(response: Response): Response {
    const { metaHandler, titleHandler } = this;
    return new Response(
      new ReadableStream({
        async start(controller) {
          const html = await response.text();

          for (const match of html.matchAll(/<meta\s+([^>]+)>/gi)) {
            const attrs = match[1];
            metaHandler?.element?.({
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
            titleHandler?.text?.({ text: titleMatch[1] });
          }

          controller.close();
        },
      }),
    );
  }
}

describe("fetchLinkPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("finds metadata after a large script-heavy prefix", async () => {
    vi.stubGlobal("HTMLRewriter", FakeHtmlRewriter);
    const fetchMock = vi.fn(async () => {
      const prefix = "x".repeat(
        YOUTUBE_STYLE_PREFIX_KIBIBYTES * KIBIBYTE_BYTES,
      );
      return new Response(
        `${prefix}
        <title>Fallback title</title>
        <meta property="og:site_name" content="Example Site">
        <meta property="og:title" content="Late Open Graph title">
        <meta property="og:description" content="Late description">
        <meta property="og:image" content="/preview.jpg">`,
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const preview = await fetchLinkPreview(new URL("https://example.com/post"));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(preview).toEqual({
      url: "https://example.com/post",
      title: "Late Open Graph title",
      description: "Late description",
      imageUrl: "https://example.com/preview.jpg",
      siteName: "Example Site",
    });
  });

  test("decodes HTML entities into plain preview text", async () => {
    vi.stubGlobal("HTMLRewriter", FakeHtmlRewriter);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          `
          <meta property="og:site_name" content="Example &amp; Co">
          <meta property="og:title" content="A &quot;quoted&quot; title">
          <meta property="og:description" content="5 &lt; 10 &amp; still safe">
          <meta property="og:image" content="/preview.jpg?name=one&amp;size=large">`,
          {
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          },
        );
      }),
    );

    await expect(
      fetchLinkPreview(new URL("https://example.com/post")),
    ).resolves.toEqual({
      url: "https://example.com/post",
      title: 'A "quoted" title',
      description: "5 < 10 & still safe",
      imageUrl: "https://example.com/preview.jpg?name=one&size=large",
      siteName: "Example & Co",
    });
  });
});
