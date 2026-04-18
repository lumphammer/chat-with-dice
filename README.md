# Chat with Dice

A tool for GMs and players who want to play low-prep/no-prep TTRPGs online.

## Usage

Head to [Chat with Dice](https://chatwithdice.lumphammer.net) and sign up.

## Development

I develop on Linux, but it should work on MacOS. I have no idea if it will work on Windows.

### 1. Dev tools

[Install Node.js](https://nodejs.org/en/download).

[Install pnpm](https://pnpm.io/installation).

### Setup

Clone this git repo and run `pnpm install`.

Create a `.env` file in the root of the project:

```
D1_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CLOUDFLARE_ACCOUNT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
BETTER_AUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BETTER_AUTH_URL="http://localhost:4321"
GITHUB_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GOOGLE_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="Your Name <yourname@example.net>"
```

Set up your database.

You may need to run this:

```sh
npx wrangler d1 create chatDB
```

```sh
pnpm run db:migrate:chatdb:local
```

See `package.json` for other useful commands.

### Run locally

Run the dev server with:

```sh
pnpm run dev
```

Or run in local preview mode (prerendering works the same as in prod, but you don't get live updates):

```sh
pnpm run preview
```
