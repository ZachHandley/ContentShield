/**
 * ContentShield HTTP API — runtime-agnostic Hono app.
 *
 * The same `app` runs unmodified on Node, Bun, Deno, and Cloudflare Workers.
 * Per-runtime entry points (server-node.ts, server-bun.ts, worker.ts) just
 * mount this app on the appropriate adapter.
 */

import { Hono } from 'hono'
import { configure, detect, filter, isClean } from 'content-shield'
import { EN } from 'content-shield/languages/en'

// One-time configuration. Add more languages by importing and including them
// here — `import { ES } from 'content-shield/languages/es'` etc.
await configure({
  languageData: { en: EN },
  languages: ['en'],
})

const app = new Hono()

app.get('/', (c) =>
  c.json({
    name: 'content-shield-hono-example',
    endpoints: ['POST /detect', 'POST /filter', 'POST /is-clean'],
  }),
)

app.post('/detect', async (c) => {
  const { text } = await c.req.json<{ text: string }>()
  if (typeof text !== 'string') {
    return c.json({ error: 'body.text must be a string' }, 400)
  }
  const result = await detect(text)
  return c.json(result)
})

app.post('/filter', async (c) => {
  const { text } = await c.req.json<{ text: string }>()
  if (typeof text !== 'string') {
    return c.json({ error: 'body.text must be a string' }, 400)
  }
  const filtered = await filter(text)
  return c.json({ filtered })
})

app.post('/is-clean', async (c) => {
  const { text } = await c.req.json<{ text: string }>()
  if (typeof text !== 'string') {
    return c.json({ error: 'body.text must be a string' }, 400)
  }
  return c.json({ clean: await isClean(text) })
})

export default app
