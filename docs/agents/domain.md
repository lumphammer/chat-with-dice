# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — lists each context and where its `CONTEXT.md` lives, plus shared vocabulary and cross-context relationships
- The per-context **`CONTEXT.md`** for whichever context the area you're about to work in belongs to
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/
│   ├── 0001-example.md
│   └── ...
└── src/
    └── capabilities/
        ├── cards/CONTEXT.md
        ├── files/CONTEXT.md
        ├── safety/CONTEXT.md
        └── englisheerie/CONTEXT.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant context's `CONTEXT.md` (or in `CONTEXT-MAP.md`'s shared vocabulary, for terms like Room that cut across contexts). Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 — but worth reopening because…_
