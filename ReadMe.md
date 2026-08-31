# Note Script

A full-stack MERN journaling and habit-tracking app, built as a learning vehicle to practice the patterns of a production engineering environment — not just shipping features, but security hardening, CI/CD design, and the kind of debugging that only shows up once real users hit real infrastructure.

![Architecture](./architecture.jpg)

## Tech Stack

**Client:** React 18 (TypeScript, Create React App), MUI, React Router
**Server:** Express 5 (TypeScript), Mongoose 8 / MongoDB Atlas
**Auth:** Auth0 (Google OAuth)
**Infra:** Docker, Heroku (Container Registry), GitHub Actions CI/CD
**Observability:** Pino (structured logging), Google Analytics 4
**Rate limiting:** Upstash Redis, with an in-memory fallback

## Features

- Daily journaling with tag/mood tracking, dark mode + 4 theme presets
- Full-text search (MongoDB Atlas Search)
- Year-based note filtering, real server-side pagination
- Admin role with a protected user-management view
- Google Analytics integration for traffic insight

## Architecture & Engineering Highlights

A few things worth knowing about how this app is actually built, not just what it does:

- **Found and fixed a critical NoSQL injection CVE** in Mongoose 5.x — upgraded to 8.x after specifically evaluating 8 vs. 9 (backport availability, maturity, Node version requirements) rather than blindly taking the latest major.
- **Defense in depth on input validation** — Zod schemas at the API boundary, ownership-scoped database queries, and Mongoose's own patched sanitization, so no single control failing exposes the app.
- **Rate limiting with a deliberate fail-open design** — tries Redis first for accurate cross-instance limiting, falls back to an in-memory counter on a timeout rather than either hanging the request or disabling protection entirely. Logged, not silent.
- **CI/CD that can't be bypassed** — every push (including direct pushes outside a PR) runs the same validation as a merge; nothing deploys without it. Production deploys are a deliberate manual trigger, not automatic-on-merge.
- **Structured logging with automatic secret redaction** — bearer tokens and cookies are never logged, even in dev.

## Local Development

```bash
# Server
cd server
npm install
cp config/config.example.json config/config.json  # then fill in real values, or use env vars below
npm run dev

# Client (separate terminal)
cd client
npm install
npm start
```

### Required environment variables

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | server | MongoDB connection string |
| `AUTH0_DOMAIN` | server | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | server | Auth0 API audience |
| `REDIS_URL` | server | Optional — omit to run rate limiting in-memory only |
| `REACT_APP_GA_MEASUREMENT_ID` | client | Optional — omit to disable analytics |

## Testing

```bash
cd server
npm test          # full suite, needs mongodb-memory-server
npm run lint
npx tsc --noEmit
```

Client-side test coverage is a known gap — not yet built out.

## CI/CD

GitHub Actions runs `server-checks`, `client-checks`, and `docker-build` on every push and PR. Deploys to the dev Heroku app automatically on push to `develop`. Production deploys require manually triggering the workflow from the Actions tab — a deliberate choice given required-reviewer approval gates aren't available on a private repo without a paid GitHub plan; this achieves the same "a human has to consciously decide to ship" property without the cost.

## License

MIT — see [LICENSE.md](./LICENSE.md).
