# ContentShield HTTP API (Hono example)

A ~50-line [Hono](https://hono.dev) app that wraps ContentShield as a JSON
HTTP API. The same `app.ts` runs unmodified on **Node, Bun, Deno, and
Cloudflare Workers** — pick the runtime adapter you want.

GitHub Pages can't host a real HTTP endpoint (static-only), so if you want
something callable from `fetch()` / `curl` / your game server, deploy this.

## Endpoints

| Method | Path        | Body                  | Returns                                  |
|--------|-------------|-----------------------|------------------------------------------|
| `GET`  | `/`         | —                     | metadata                                 |
| `POST` | `/detect`   | `{ "text": "..." }`   | full `DetectionResult` from ContentShield |
| `POST` | `/filter`   | `{ "text": "..." }`   | `{ "filtered": "..." }`                  |
| `POST` | `/is-clean` | `{ "text": "..." }`   | `{ "clean": true \| false }`             |

## Run it locally

### Node

```bash
pnpm install
pnpm run dev
# POST http://localhost:3000/detect
```

### Bun

```bash
bun install
bun run src/server-bun.ts
```

### Deno

```bash
deno run --allow-net --allow-env --allow-read npm:tsx src/server-node.ts
```

## Deploy to Cloudflare Workers (free tier — 100k req/day)

```bash
pnpm install
# one-time: `npx wrangler login`
pnpm run deploy:cf
```

The free Workers tier gives you 100,000 requests per day with no credit
card. `wrangler.toml` and `src/worker.ts` are the only deploy-specific
files; everything else stays runtime-agnostic.

## What's intentionally NOT included

- **Auth / rate limiting.** Add `hono/jwt` or a Cloudflare Workers KV–backed
  rate limiter once you have a real consumer. Don't ship this publicly
  without one.
- **Multi-language.** Only English is configured in `app.ts`. Add other
  locales by importing them:
  ```ts
  import { ES } from 'content-shield/languages/es'
  import { DE } from 'content-shield/languages/de'
  await configure({
    languageData: { en: EN, es: ES, de: DE },
    languages: ['en', 'es', 'de'],
  })
  ```
- **Streaming / batch.** This example processes one body at a time; that
  matches how most game-chat and comment-moderation flows actually work.
