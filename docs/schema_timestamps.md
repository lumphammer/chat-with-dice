# Schema timestamps and how they went wrong and how we fixed it

Two tables in the User Data Schema have columns that represent dates, and are supposed to be integers - epoch milliseconds[1]. They were given a default value defined in the Drizzle schema as:

```ts
    sharedTime: int()
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
```

This was an LLM suggestion while I was experimenting with using such things, and while I was reviewing the code it generated, this one slipped through the net because it looks so plausible. Unfortunately, `CURRENT_TIMESTAMP` is a string of ISO-formatted date and time, not an integer.

This didn't cause any issues for a long time because we weren't really using these timestamp columns. But recently, while trying to tidy up some menu implementations, I found myself wading though multiple fiddly, hyperlocal type definitions. Much like the blooper above, each one looked plausible, and certainly the code worked. So each LLM submission was passing my review because it wasn't _wrong_. The model wasn't generating six new types on every request, it was generating one, here and there, and each time it was, in isolation, not unreasonable.

But after a few rounds of asking the robots to write something, we had a proliferation of tiny types that all, basically, meant "a node in a filetree." There were a few that were flattened out from the nested structure that the DB returns; some were manually constructed and somewhat resembled the core database types; some were type-fu arrangements of `Extract<..>` and `Omit<...>`. So I took a decision to clean up all of these types, creating one canonical type that strongly means "a file tree node" in a way that can be sent to clients, and then use that for capability state (shares), "item shared" messages, and the actual FileManager.

In doing so I created a zod validator for this new type, and employed it everywhere it was needed. So now, even though we weren't _using_ those timestamp columns, we were getting zod errors because that which was supposed to have been an int was in fact a string. Before, it had been ignored or dropped, but now we were passing round full instances of the new type _and checking them._

The first fix was in the database schema: the correct way to get epoch milliseconds in a SQLite db is this:

```ts
    sharedTime: int()
      .notNull()
      .default(sql`(unixepoch(CURRENT_TIMESTAMP) * 1000)`),
  },
```

First off, the extra brackets around the whole SQL expression cause SQLite to evaluate the expression every time a row is inserted, rather than using it as a fallback when returning a row with a NULL in that column.

`unixEpoch` gets you epoch _seconds_ based on the given timestamp, then we multiply it up to milliseconds.

As a side note, the only reason this was even a possible failure is that SQLite is dynamically typed - you can literally store anything an any column. Normally a typed layer like Drizzle would fix that for you, but when we drop down into raw SQL we lose that protection.

But we already had some of these strings-that-should-be numbers trapped in serialized state in the database. The fix for these was in the zod validator definition. Instead of:

```ts
      dateShared: z.number(),
```

We have:

```ts
      dateShared: z.preprocess((x) => {
        if (typeof x === "number") {
          return x;
        }
        if (typeof x === "string") {
          try {
            return new Date(x).getTime();
          } catch {
            return 1;
          }
        }
        return 1;
      }, z.number()),
```

## Learnings

Avoid raw SQL as much as possible. Unfortunately there's always a case where you have to use it, and personally I'll take the risks in order to use the DB to its best potential, rather than make something worse-but-safer.

"Timestamp" doesn't always mean "epoch milliseconds." It often does, but not always.

[1]: We could have gone with epoch seconds tbh but it's too late.
