type HtmlRewriterElement = {
  getAttribute(name: string): string | null;
};

type HtmlRewriterText = {
  text: string;
};

type HtmlRewriterLike = {
  on(
    selector: string,
    handlers: {
      element?: (element: HtmlRewriterElement) => void;
      text?: (text: HtmlRewriterText) => void;
    },
  ): HtmlRewriterLike;
  transform(response: Response): Response;
};

export type HtmlMetadata = {
  title?: string;
  meta: Record<string, string>;
};

export type CreateHtmlRewriter = () => HtmlRewriterLike;

function defaultCreateHtmlRewriter(): HtmlRewriterLike {
  return new HTMLRewriter() as HtmlRewriterLike;
}

function normalizeMetaKey(key: string | null): string | null {
  const normalized = key?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export async function extractMetadataFromHtml(
  html: string,
  createHtmlRewriter: CreateHtmlRewriter = defaultCreateHtmlRewriter,
): Promise<HtmlMetadata> {
  const metadata: HtmlMetadata = { meta: {} };
  let title = "";

  const rewriter = createHtmlRewriter()
    .on("meta", {
      element(element) {
        const key = normalizeMetaKey(
          element.getAttribute("property") ?? element.getAttribute("name"),
        );
        const content = element.getAttribute("content")?.trim();
        if (key && content && metadata.meta[key] === undefined) {
          metadata.meta[key] = content;
        }
      },
    })
    .on("title", {
      text(text) {
        title += text.text;
      },
    });

  await rewriter.transform(new Response(html)).arrayBuffer();

  const trimmedTitle = title.trim().replace(/\s+/g, " ");
  if (trimmedTitle) {
    metadata.title = trimmedTitle;
  }

  return metadata;
}
