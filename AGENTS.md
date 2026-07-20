# Notes for LLMs

The mission and values for this project are available in MISSION.md.

## Tech stack

- Astro 6.0 + react islands
- Cloudflare workers with Drizzle ORM over a D1 database
- Cloudflare Durable Objects

## Rules and gotchas

Remember that `React.FormEvent` is deprecated. The deprecation notice is:

> FormEvent doesn’t actually exist. You probably meant to use ChangeEvent, InputEvent, SubmitEvent, or just SyntheticEvent instead depending on the event type.

Favour keeping component files short by breaking out subcomponents, even if they're only used on one place.

In our `pages/` tree, any page with more than trivial complexity should be expressed as a React component, located nearby under `src/components` folder.

Icons in react components should come from lucide-react where possible.

Avoid hard-coding colors - use theme colours where possible. If the theme doesn't contain something you need, stop and ask the user about the possibility of adding it.

## Type casts (`as`)

Try to avoid casts unless there's a definite bug in a packages types, or it's a situation where Typescript can't keep up (like correctly typing the result of `Object.fromEntries(Object.toEntries(...).map(...))`).

If you find yourself reaching for an `as`, think about whether it's needed at all, or could be replaced with a type predicate for real type certainty.

## Checking your work

When you've finished your changes, run `pnpm run check`. This will check types, linter, formatting, and build the project.

In a sandbox or Claude Code web session without real secrets, the `build` step fails during prerender because `envOrDie` throws on missing OAuth/API secrets (`GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_SECRET`, `RESEND_API_KEY`). These aren't exercised by a static prerender, so run the check with `CI=true` — `envOrDie` skips the missing-var throw under CI — and it passes cleanly with no secrets:

```sh
CI=true pnpm run check
```

## Database schema migration

Database schema migrations are creating by editing the Drizzle schema definition in `src/schemas/*` and then running `pnpm run db:generate:...` (where ... corresponds to the schema you udated.)

Do not write migrations yourself. They are _only_ generated. If we need a schema change that generates an impossible migration (e.g. adding a not-null column to a table that already has rows) stop and ask the user how to resolve it.

## Commit message style

- All lowercase — never capitalise the first word (exception: all-caps single-word notes like `TODO` or `MISSION`)
- No trailing punctuation
- No conventional-commits prefixes (`feat:`, `fix:`, `chore:`, etc.)
- Single line only — no body, no footer
- Short and punchy — aim for 3–6 words
- Start with an action verb: `add`, `fix`, `make`, `rename`, `strip`, `allow`, `start`, `plumb`, etc.
- Informal, honest language is fine — "first stab at …", "start making …", "work towards …"
- For multi-step work use phase suffixes: `foo phase 1`, `foo phase 2`
- Never include issue numbers or PR links

## We are not using TDD

You don't have to write tests for everything. You _can_ write tests where the subject is neatly self-contained and you can write tests without having to do mad levels of mocking and faking.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`lumphammer/chat-with-dice`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.

## Running local CLI tools

We use `pnpm exec`, not `npx`, to run CLI tools. (`pnpm dlx` to download-and-run if needed.)

## Tailwind and Fonts

Avoid using .text-sm or smaller unless a piece of text is truly incidental (in which case does it need to be on screen at all?) The basic rule is: if it's on screen, it's to be read, and if it's to be read, it should be easy to read.
