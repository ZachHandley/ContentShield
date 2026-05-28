import app from './app.js'

const port = Number(process.env.PORT ?? 3000)
console.log(`ContentShield API listening on http://localhost:${port}`)
export default { port, fetch: app.fetch }
