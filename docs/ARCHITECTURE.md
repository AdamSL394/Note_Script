# Architecture

This is the deeper companion to the diagram in the [README](../ReadMe.md) — how the
pieces actually fit together and why, for anyone reading the code for the first time.

## System overview

```
Browser (React SPA)
  │  Bearer JWT on every request
  ▼
Express server
  ├─ helmet (CSP)
  ├─ pino-http (structured logging, secrets redacted)
  ├─ checkJwt (verifies the Auth0 JWT)        ─── per-router, before apiRateLimiter
  ├─ apiRateLimiter (per-user, Redis/in-memory hybrid)
  ├─ requireAuth (derives + attaches verifiedUserId)
  ├─ validateBody (Zod, per-route)
  ├─ requireAdmin (admin-only routes; re-checks the DB role, never trusts a claim)
  └─ route handler → controller → Mongoose → MongoDB Atlas
```

Auth0 (OAuth, Google as the identity provider) issues the JWT the client attaches
to every API call. Redis (Upstash) backs the rate limiter and the analytics cache,
both with an automatic in-memory fallback — see [Rate limiting & caching](#rate-limiting--caching)
below. GitHub Actions validates and deploys; see [CONTRIBUTING.md](./CONTRIBUTING.md#cicd).

## Client

**Stack:** React 18 (TypeScript, Create React App), MUI, React Router 6.

**Entry point:** `client/src/App.tsx` wraps the app in `ThemeModeProvider` (the
6-theme system — see `hooks/useThemeMode.tsx` and `theme/nsTokens.ts`, which hand-mirror
`tokens.css`'s CSS custom properties as real hex values, since MUI's palette/`alpha()`
can't resolve `var(--ns-*)` strings), then `ThemeProvider`, `BrowserRouter`, and the app
shell (nav, router outlet, footer, cookie banner, install prompt).

**Routing:** `client/src/router/index.tsx`. Everything except `/login`, `/privacy`,
`/terms`, and `/contact` sits behind `ProtectedRoute` (`hooks/protectedRoute.tsx`), which
redirects to Auth0 login if unauthenticated. Analytics, Upload, AdminUsers,
PrivacyPolicy, TermsOfService, Contact, AdminContact, and NotFound are all
`React.lazy`-loaded — Analytics specifically because it pulls in `recharts`
(~100KB gzipped), the rest because they're each visited infrequently and splitting
them keeps the common-path bundle (Home/AllNotes/Login) lighter.

**Directory layout:**

| Path | Contents |
|---|---|
| `components/` | One folder per UI piece. `HomeView/`, `HomeComponents/`, `Note/`, `Notes/` are the note-reading/editing surfaces; `Navbar/`, `Footer/`, `Modal/` are shell chrome; the rest are focused single-purpose components (`ScrollableChipRow`, `EmojiPicker`, `DateRange`, etc.). |
| `views/` | Top-level route targets (`Home`, `AllNotes`, `Analytics`, `UserSettings`, `AdminUsers`, ...) — thin wrappers that compose `components/`. |
| `hooks/` | Shared stateful logic: `useNoteEditing` (the note update/save/cancel-edit flow — see [Note update flow](#note-update-flow) below), `useIsAdmin`, `useThemeMode`, `useAuthTokenSync`, `usePushNotifications`, `usePwaInstallPrompt`, `protectedRoute`. |
| `router/` | `noteRoutes.ts` and friends — the typed fetch wrappers around every server endpoint (see [API.md](./API.md)) — plus `client.ts`, the shared `request`/`requestJson` helpers that attach the bearer token. |
| `types/` | Shared TypeScript interfaces (`Note`, `ChecklistItem`, `TagSnapshot`, ...) — hand-kept in sync with the server's Mongoose interfaces (`server/models/`), since client and server are separate TypeScript projects with no shared-package setup. |
| `theme/`, `constants/`, `utils/`, `config/` | Theme tokens, shared constants (reserved field names, win tags), small pure helpers (date formatting, star rendering, tag color), environment config. |

**State management:** no Redux/Context-for-data-fetching layer — each view owns its
own `useState`/`useEffect` data fetching, with cross-cutting concerns (note editing,
admin status, theme) lifted into hooks instead. Intentionally simple for the app's
size; revisit if prop-drilling becomes a real problem.

### Note update flow

Worth walking through once, since several bugs (and the checklist-persistence one
specifically — see the commit history around `server/routes/notes.ts`) have lived in
this path: `useNoteEditing.updateNote(note)` → `NoteRoutes.updateNote(note)` → the
server echoes back the *post-update* note → the hook **replaces** that note in local
state with whatever the server returned, not the locally-mutated object. This is
deliberate — the server is the source of truth — but it means a silently-dropped
field (the exact failure mode of the checklist bug) produces no visible error: the
request still returns 200, the UI just quietly doesn't change. `updateNote` returns
a `boolean` for exactly this reason; callers that skip checking it (a few of the
checklist-toggle call sites did, historically) lose that signal.

## Server

**Stack:** Express 5 (TypeScript), Mongoose 8 / MongoDB Atlas.

**Entry point:** `server/server.ts`. Boot order matters: `connectToDB` is fully
`await`ed — including its own retry/backoff (`database/db.ts`) — before
`app.listen()` runs, so the process never serves traffic against a database it was
never able to reach; a connection failure after retries exits the process instead.
An hourly `node-cron` job (`sendDueReminders`, in `controller/pushController.ts`)
sends due push-notification reminders. `SIGTERM` triggers a graceful shutdown of the
rate-limit store and cache's Redis connections.

**Middleware chain**, applied per-router (`/notes`, `/api/users`, `/notifications` —
`/contact` is partially public, see below):

1. `checkJwt` — verifies the Auth0 JWT's signature/audience/issuer (via
   `express-oauth2-jwt-bearer`). Short-circuits `OPTIONS` requests (CORS preflight).
2. `apiRateLimiter` — 300 requests/15min by default (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`
   env vars), keyed by the verified user id (not IP — an authenticated app doesn't
   want an entire office/household sharing one bucket). Must run after `checkJwt`
   since its key generator reads `req.auth`.
3. `requireAuth` (route-level, not router-level) — derives `verifiedUserId` from the
   verified JWT and attaches it to `req`; routes read it via `getRequiredUserId(req)`,
   which throws loudly if called on a route that forgot this middleware, rather than
   silently passing `undefined` into a Mongo query.
4. `validateBody(schema)` (route-level, where the route takes a body) — a Zod schema
   parses `req.body` and *replaces* it with the parsed result, stripping any
   unrecognized keys. This is the real defense against NoSQL injection via
   type confusion (e.g. `{"text": {"$ne": null}}`), not just a TypeScript-level
   contract — see [DATA_MODEL.md](./DATA_MODEL.md#validation-vs-the-mongoose-schema).
5. `requireAdmin` (route-level, admin-only routes) — re-queries the user's `role`
   from the database on every request; never trusts a client-supplied claim.

`/contact/submit` is the one deliberately public, unauthenticated route (a visitor
reading the Privacy Policy before signing up needs to reach it) — protected instead
by `contactFormRateLimiter` (IP-keyed, 5/15min) and the schema's length limits.
`/health` is also public and unauthenticated, for uptime monitoring.

**Directory layout:**

| Path | Contents |
|---|---|
| `routes/` | Express routers — thin: parse/destructure the request, call a controller function, shape the response. `notes.ts`, `userSettings.ts`, `notifications.ts`, `contact.ts`. |
| `controller/` | The actual logic — Mongoose queries, aggregation pipelines, business rules. `noteController.ts` is the largest by far (CRUD plus every analytics aggregation); `userController.ts`, `pushController.ts`. |
| `models/` | Mongoose schemas + their TypeScript interfaces. See [DATA_MODEL.md](./DATA_MODEL.md). |
| `middleware/` | `checkJwt`, `requireAuth`, `requireAdmin`, `validateBody`, `apiRateLimiter`/`rateLimiter` (the hybrid store), `contactFormRateLimiter`, `errorHandler`, `upload` (bulk note import parsing). |
| `validation/schemas.ts` | Every Zod schema, one per request body shape. |
| `cache.ts` | `withCache`/`invalidateUserAnalyticsCache` — see below. |
| `database/db.ts` | Connection + retry/backoff logic. |
| `utils/` | `redactSecrets` (log scrubbing), `userId` (normalizes the Auth0 `sub` claim). |

### Rate limiting & caching

Both follow the same shape, deliberately: try Redis first with a short (300ms)
timeout, fall back to an in-memory equivalent on any failure or timeout, log the
fallback (throttled to once/minute, not once/request, so a sustained outage doesn't
flood the logs) rather than failing the request. Caching additionally **fails
open** on the read side (a cache miss or error just computes fresh) and treats a
cache *write* as fire-and-forget (never holds up the response). Analytics cache
entries are keyed `analytics:{userId}:{kind}` with a 600s TTL, and explicitly
invalidated (`invalidateUserAnalyticsCache`) on every note create/update/delete/
upload — the TTL is a backstop for a lost invalidation, not the primary mechanism.
Without a `REDIS_URL` configured (e.g. local dev), both are permanent, silent
no-ops — the app works identically, just without the performance benefit.

## Request lifecycle, end to end

A checklist toggle, as a concrete example (see
[DATA_MODEL.md](./DATA_MODEL.md#note) for the `checklist` field itself):

1. User clicks a checkbox on a saved note → `HomeView.toggleChecklistItem` builds a
   new `checklist` array immutably and calls `updateNote({ ...note, checklist })`
   (from `useNoteEditing`).
2. `NoteRoutes.updateNote` (`router/noteRoutes.ts`) sends a `PATCH /notes/update/:id`
   with the full note shape the server's `updateNoteSchema` expects.
3. Server: `checkJwt` → `apiRateLimiter` → `requireAuth` → `validateBody(updateNoteSchema)`
   → the route handler destructures the validated body and calls
   `noteController.updateNote(id, userId, options)`.
4. The controller builds a `$set` document — `tags` and `checklist` are each only
   set when the caller actually sent one (so an unrelated field update never
   silently wipes either array) — and runs `findOneAndUpdate({ _id, userId }, ...)`,
   scoped to the requester's own `userId` so a note can never be edited by knowing
   only its `_id`.
5. The route handler also fires `invalidateUserAnalyticsCache(userId)`
   (fire-and-forget) and returns the updated document.
6. Client: `useNoteEditing.updateNote` replaces the note in local state with
   whatever the server returned — see [Note update flow](#note-update-flow) above
   for why that matters.

## Deployment

Docker image (`server/Dockerfile`) builds the client and serves its static build
from the Express process itself (`server.ts`'s `express.static` + SPA fallback) —
one container, one deploy, no separate static host. GitHub Actions builds and
pushes that same image to Heroku's Container Registry; see
[CONTRIBUTING.md](./CONTRIBUTING.md#cicd) for the full pipeline.
