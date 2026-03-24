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

SVGs should not be inlined, but stored in .svg files in the _components folder.
