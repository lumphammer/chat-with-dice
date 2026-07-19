# 3. Accessible descriptions and AI Card transcription

Status: proposed

## Context

We want AI-generated text for Cards — both for accessibility (screen-reader
users get nothing from a bare Card Image today) and for general UX (a readable
summary of what a Card is). Basic OCR is not enough: TTRPG Cards vary wildly in
layout, iconography, and the split between rules text and flavour, so this needs
a vision-language model, not character recognition.

That capability does not stand on its own. It sits at the end of three pieces of
work that have a natural order, and doing them out of order paints us into
corners:

1. Every **User File** — not just Card Images — should be able to carry
   human-authored accessibility text. Card Images are just the first consumer.
2. Some users will not want AI involved in their account at all. That preference
   has to exist and be respected _before_ we ship anything that calls a model on
   their content.
3. Only then does AI Card transcription make sense: it becomes a way to
   _populate_ the fields from (1), gated by the switch from (2).

This ADR records the shape of all three phases and the decisions that bind them,
so each phase can be built and reviewed on its own without foreclosing the next.

Two accessibility facts drive the data model (see Decision 1):

- An image's accessible **name** comes from `alt` (or `aria-label` /
  `aria-labelledby`) and is **plain text** — markup in `alt` renders as literal
  characters.
- An image's accessible **description** is separate, supplied via
  `aria-describedby` referencing other DOM, and _can_ be long and structured.

These are different ARIA roles, not two names for one thing.

## Decision

**Ship human-authored accessibility text for all files first, then an AI
opt-out, then AI Card transcription that populates the same fields.**

### 1. Two fields, two roles: `altText` and `description`

We store **two** nullable fields, on the `files` table in `UserDataDO`
(`src/schemas/UserDataDO-schema.ts`), because they map to two distinct ARIA
roles with different constraints:

- **`altText`** — the accessible **name**. Short, **plain text**. Rendered as
  the `alt` on every `<img>` for the file. This is the universal field: it makes
  sense for any image, and it is the highest-value accessibility win because it
  is what a screen reader announces in place of the image.

- **`description`** — the accessible **description**. Long, and **may be
  structured** (headings, lists, rules-vs-flavour). Surfaced as real, visible
  DOM in the zoom view, with the inline/thumbnail `<img>` pointing at it via
  `aria-describedby`.

`description` is deliberately _not_ crammed into a hidden `aria-describedby`
target: screen readers flatten a referenced description into a single text run,
which destroys the very structure that makes a transcription useful. Rendering
it as visible content keeps its headings and lists navigable.

`alt` cannot carry formatting and `aria-describedby` cannot supply a name, so
neither field can substitute for the other. Both are nullable — the field being
absent is normal, and `altText=""` remains meaningful as the standard "this
image is decorative" marker.

Schema change is generated, not hand-written (per `AGENTS.md`): both columns are
nullable, so the migration is valid against the existing rows.

### 2. Phase 1 — human-authored text for all files, no AI

Users can set and edit `altText` and `description` on any file they own, through
the File Manager. This ships with **no model involvement at all**. It is a
plain accessibility feature that stands on its own merits and is worth having
even if phases 2 and 3 never happen.

`description` is offered for all files but will mostly matter for richer content
like Cards — a photo needs a name far more than a paragraph. We do not force it.

### 3. Phase 2 — an AI opt-out in user preferences

A per-user **AI kill switch** lands before any model-calling code. It defaults
**on** — users are opted in to AI features, and the switch is an **opt-out** for
those who don't want AI touching their account. With it off, no Card Image of
that user's ever leaves for — or is processed by — a model, and the
transcription affordances from phase 3 are hidden, not merely disabled.

This is deliberately its own phase so that the opt-out exists and is testable
before phase 3 gives it something to gate.

### 4. Phase 3 — AI transcription populates the same fields

Transcription does not introduce a parallel data path. It **writes `altText` and
`description`** — the exact fields from phase 1 — so everything already wired to
those fields (the `<img>` alt, the zoom-view description) lights up for free, and
a user can hand-correct an AI result through the same editor.

Design constraints, carried from the earlier investigation:

- **Derived, but cached.** Unlike a Card (ADR-0001 decision 3, "Cards are
  derived, not stored"), a transcription is expensive to compute, so it is
  stored. This is a deliberate exception to the derive-don't-store rule, recorded
  here so it is not mistaken for drift.
- **User-initiated only.** Extraction fires **only** on an explicit user signal
  — a per-Card or per-Deck button — never as a side effect of uploading a file,
  marking a folder as a Deck, or an image becoming ready. Automatic extraction
  would spend money and (for external providers) exfiltrate content the user
  never asked us to process, and it defeats the phase-2 opt-out's intent even
  when the switch is on. The signal is the trigger; nothing else is.
- **Async, off the request path.** Once triggered, extraction runs deferred,
  mirroring the existing alarm/`AbstractScheduler` pattern in
  `UserDataDO/Scheduler.ts` (or Cloudflare Queues for a "transcribe this Deck"
  fan-out), so the click returns immediately and retries are free.
- **Full image, not the thumbnail.** The 256px WebP thumbnail from
  `useUpload.ts` is for display and is too small for fine rules text; extraction
  reads the full Card Image from `PRIVATE_R2`.
- **Structured output, not raw HTML.** The model returns structured JSON
  (name/alt, rules text, flavour, icons); we render the HTML ourselves in a
  React component under `src/components`. This avoids sanitisation risk and keeps
  theme colours and markup under our control (per `AGENTS.md`).
- **Provider-swappable.** The extractor sits behind a small interface so the
  model/provider can change without touching callers (see Decision 6).
- **Versioned + user-editable.** An `extractionStatus`/`extractionVersion` plus
  an `isUserEdited` marker let us re-run when the prompt improves without
  clobbering a human correction.
- **Fronts only.** Common Backs are shared, so we transcribe a back once and
  reuse it rather than paying per Card.

### 5. Privacy is a real fork, decided by the kill switch and the provider

Card Images live in `PRIVATE_R2`. Any external model (Anthropic or otherwise)
means user content leaves Cloudflare; Workers AI keeps it on-CF. The phase-2
kill switch is the user-facing control over this; the provider choice in
Decision 6 is the infra-facing one. Both are recorded so the trade-off is a
conscious decision, not an accident of whichever SDK we reached for.

### 6. Provider choice is deferred, but costed

We do **not** commit a provider in this ADR — a provider strategy is pending
experiments (quality on real Decks, the privacy fork in Decision 5, the cost
picture below). The extractor interface exists precisely so those experiments
can swap providers without touching callers: Cloudflare Workers AI (on-CF,
cheapest, lower quality on wild Cards) or a frontier vision model via Cloudflare
AI Gateway (Claude Haiku 4.5 or Sonnet 5, higher quality, content leaves CF).
Because transcription is **cache-once**, the total spend for a Deck is bounded
and small regardless — so quality, not per-token price, is expected to drive the
choice. The estimator below is an input to that decision, not the decision.

## Cost estimator

Transcription cost is dominated by **input** tokens (a Card Image is large; the
output summary is small) and is paid **once per Card** (results are cached per
Decision 4). Model it per Card, then multiply by Deck size.

**Token model** (per Card):

- `image_tokens ≈ (width_px × height_px) / 750` — the Claude image-token rule of
  thumb. Parameterise by the Card's rendered resolution.
- `prompt_tokens ≈ 200` — the fixed instruction preamble.
- `output_tokens ≈ 300` — the JSON summary (name + rules + flavour + icons).

**Cost formula** (per Card):

```
cost = (image_tokens + prompt_tokens) × input_$/tok
     +  output_tokens                 × output_$/tok
```

**Per-Card and per-1,000-Card estimates** at three common Card resolutions.
Prices are $/1M tokens: Workers AI Llama 3.2 11B Vision ≈ $0.049 in / $0.68 out;
Claude Haiku 4.5 = $1 / $5; Claude Sonnet 5 = $3 / $15 (intro $2 / $10 through
2026-08-31). `image_tokens` shown per row.

| Card resolution   | image_tokens | Workers AI Llama Vision |              Haiku 4.5 |       Sonnet 5 (intro) |
| ----------------- | -----------: | ----------------------: | ---------------------: | ---------------------: |
| 512×768 (small)   |         ~525 | ~$0.0003 → **$0.28/1k** | ~$0.0022 → **$2.2/1k** | ~$0.0045 → **$4.5/1k** |
| 768×1024 (medium) |        ~1050 | ~$0.0003 → **$0.31/1k** | ~$0.0028 → **$2.8/1k** | ~$0.0055 → **$5.5/1k** |
| 1024×1536 (large) |        ~2100 | ~$0.0004 → **$0.42/1k** | ~$0.0038 → **$3.8/1k** | ~$0.0075 → **$7.5/1k** |

**Workers AI wall-time caveat:** Workers AI also bills ~$0.0005/second of
model wall-time. A vision request of a few seconds adds ~$0.0015–0.0025 per
Card — which _exceeds_ its token cost and narrows the gap to Haiku
considerably. Fold it in as `+ wall_seconds × $0.0005` per Card when comparing.

**Reading the table:** a typical Deck (say 78 Cards of a tarot-sized set at
medium resolution) costs well under **one cent** to transcribe on Workers AI and
around **20–45 cents** on Haiku/Sonnet — one time. This is the crux: optimising
per-token price on a bounded, cached job saves fractions of a cent, while a
single re-run because a cheap model misread half a Deck costs more in effort
than the entire model bill. Hence Decision 6 prefers quality, with the on-CF
model as the cost/privacy floor.

## Consequences

- Phase 1 is shippable and valuable with zero AI. It also fixes a current gap:
  the zoom view (commit `3243be8`) and the Card-draw chat bubbles carry no
  meaningful `alt` today.
- Wiring `altText` into Card `<img>` alts is the cheapest, highest-value
  accessibility step and should land first within phase 1.
- The kill switch defaults on (opt-out). Combined with the user-initiated-only
  trigger (Decision 4), a default-on user still never has a Card processed until
  they click; the switch is the standing "never, don't even offer it" control,
  the per-action signal is the per-use consent.
- Storing a transcription is a deliberate departure from ADR-0001 decision 3.
  If a Card Image is later replaced, the cached transcription for the old
  content is stale; `extractionVersion` plus re-run on image change handles this,
  and a stale row is no worse than a stale thumbnail.
- The estimator assumes the Claude image-token heuristic; Workers AI counts
  images differently, so treat its column as indicative and re-measure with
  `count_tokens`-equivalent tooling before relying on a precise figure.
