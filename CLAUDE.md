# Notes for LLMs

This is a tabletop RPG chat app which allows the users to make dice rolls alongside the chat.

## Tech stack

* Astro 6.0 + react islands
* Cloudflare workers with Drizzle ORM over a D1 database
* Cloudflare Durable Objects

## Rules and gotchas

Remember that `React.FormEvent` is deprecated. The deprecation notice is: 

> FormEvent doesn’t actually exist. You probably meant to use ChangeEvent, InputEvent, SubmitEvent, or just SyntheticEvent instead depending on the event type.

Favour keeping component files short by breaking out subcomponents, even if they're only used on one place.

In our `pages/` tree, any page with more than trivial complexity should be expressed as a React component, located nearby under a `_components` folder.

Icons in react components should come from lucide-react where possible.

Avoid hard-coding colors - use theme colours where possible. If the theme doesn't contain something you need, stop and ask the user about the possibility of adding it.

## Type casts (`as`)

Try to avoid casts unless there's a definite bug in a packages types, or it's a situation where Typescript can't keep up (like correctly typing the result of `Object.fromEntries(Object.toEntries(...).map(...))`).

If you find yourself reaching for an `as`, think about whether it's needed at all, or could be replaced with a type predicate for real type certainty.

## Checking your work

When you've finished your changes, run `pnpm run types:check` to check types, and `pnpm run lint:check` for linting.

## Commit message style

* All lowercase — never capitalise the first word (exception: all-caps single-word notes like `TODO` or `MISSION`)
* No trailing punctuation
* No conventional-commits prefixes (`feat:`, `fix:`, `chore:`, etc.)
* Single line only — no body, no footer
* Short and punchy — aim for 3–6 words
* Start with an action verb: `add`, `fix`, `make`, `rename`, `strip`, `allow`, `start`, `plumb`, etc.
* Informal, honest language is fine — "first stab at …", "start making …", "work towards …"
* For multi-step work use phase suffixes: `foo phase 1`, `foo phase 2`
* Never include issue numbers or PR links
