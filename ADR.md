# Architectural Decision Record

## Stack

### React

Mainstream, huge ecosystem, still getting major development effort, gets the job done, long-term prospects very good.

Also considered:

Solid: Great choice, but I've already worked in React a lot more and this wasn't an area where I wanted to go leftfield.

Preact: Not quite mainstream enough. DX is almost identical to React, main advantages are render speed and bundle size but I was happy with React.

Vue, Svelte: Good options, but I prefer the code-first approach.

### Astro

I love the mental model - makes static content very easy and leaves to door open to any reactive renderer.

Downsides: your React components live in separated islands, which can make data fetching wonky if you need to share overall app state. For example, login state can't just be held at the top of a single React tree, you need to read it in on each island. That said, mostly I'm only using islands to run an entire page body (just the HTML skeleton and nav bar come from Astro) so it's not too bad.

Another upside is that Astro 6+ has excellent Cloudflare Workers support, and an fact the project has been acquired by Cloudflare so it's a safe bet that that support will only get better.

Also considered:

Next, TanStack Start: would have been fine, probably.

### Cloudflare Workers / Durable Objects

CF are doing huge things in the edge computing world. DX not quite as polished as some, but Durable Objects are just incredibly good and solve the question of persistent connections in a serverless world. Given that this is at it's core a chat app, having a built-in solution for WebSockets is a huge win.

Also considered:

Almost any other serverless solution: requires extra services to handle WebSockets.

Dockerization or a VPS: makes the server stateful. Serverless is preferable for a single-maintainer project.

### Drizzle + D1

D1 is a no-brainer if you're on CF Workers. For my workload I'm unlikely to need anything bigger for a while: we're only storing users and room definitions, while the actual message logs are held inside the Durable Objects' own built-in SQLite databases.

Drizzle: a brilliant re-think of what an ORM is. It's actually not really an ORM, although they use that term so folks know what space it's in. It's a thin, typed wrapper over SQL, plus an alternative way of making very safe single-call queries based on a declarative approach to relations (you declare the relations in code and then Drizzle can assemble the most efficient query for you.) Plus a migrations system that can run code-first, SQL first, or DB-first, and generate and apply the migrations for you.

The risk factor with Drizzle is that's very young. I'm using (as of writing) the 1.0-beta releases, which introduce some massive changes compared to the 0.x releases. I need to be ready for instability as they approach the big 1.0. I deem it acceptable because I'm confident that in time it will become the go-to Typescript relational tool.

It also suffers from weak documentation - patchy in places, and written by someone who I assume does not have English as a first language. Again, this is a transient problem.

### Better Auth

I wanted the power to have a bunch of OAuth integrations and login methods, without learning the guts of OAuth myself. I also didn't want to to be knitting my own auth back-end, period, because of the high likelihood of creating a security disaster in the process.

A third-party service like Clerk or Auth0 would have solved that but I want to limit the number of "free tiers" I'm relying on that may dry up one day.

Better Auth requires more setup, especially for a first-timer, but it was a cost I was willing to pay.

Since auth data lives in our own D1 database, we are not dependent on a third party service. Auth interactions are routed through a single module, minimising the surface area of a potential migration. The primary migration targets would be building on Oslo primitives directly, or adopting a managed service if the project's scale (and income?) warrants it.

## Naming

We use Zod extensively. We refer to what Zod usually calls a "schema" as a "validator". This is to avoid confusion with database schemas.
