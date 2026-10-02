# API reference

All routes except `GET /health` and `POST /contact/submit` require a bearer JWT
(`Authorization: Bearer <token>`, issued by Auth0) and are subject to the per-user
rate limit (300 req/15min by default). A missing/invalid token returns
`401 { "error": "Unauthorized" }`; a body that fails its Zod schema returns
`400 { "error": "Invalid request body", "details": [{ "path", "message" }, ...] }`;
an uncaught error returns `500 { "error": "Internal server error" }` (never the raw
message, to avoid leaking internals — 4xx errors do include their real message).
See [ARCHITECTURE.md](./ARCHITECTURE.md#server) for the full middleware chain these
routes sit behind, and [DATA_MODEL.md](./DATA_MODEL.md) for the shapes referenced
below (`Note`, `User`, etc.).

Routers are mounted as: `/notes` → `routes/notes.ts`, `/api/users` → `routes/userSettings.ts`,
`/notifications` → `routes/notifications.ts`, `/contact` → `routes/contact.ts`.

## Notes (`/notes`)

| Method & path | Auth | Body / query | Response |
|---|---|---|---|
| `GET /all` | user | query: `page`, `pageSize` (max 100, default 30), `sort` (`asc`\|`desc`) | `{ notes: Note[], totalCount: number }` |
| `GET /count` | user | — | `{ count: number }` |
| `GET /all/order` | user | — | `Note[]`, newest-first, capped at 2000. Not called from the client UI (confirmed dead during a pagination audit) — kept for any direct/scripted use. |
| `GET /note/:id` | user | — | The single note, scoped to the requester's own `userId`. |
| `GET /search/:id` | user | `:id` is the search query text, not a user id | `Note[]`. Uses MongoDB Atlas Search (`$search`) — returns `503` on any non-Atlas database (plain MongoDB, `mongodb-memory-server`), not a rare edge case. |
| `POST /noterange` | user | `{ start, end, sort? }` — `noteRangeSchema` | `Note[]` within the date range (inclusive), used by the Home weekly widget's Look Back control. |
| `GET /lastyear/:tdYearAgo/:lwYearAgo` | user | query: `sort` | `Note[]` — same-shaped range query as above, for the "N years ago" Look Back option. |
| `POST /note` | user | `{ text, date, star?, tags?, checklist? }` — `createNoteSchema`. Requires non-empty `text` *or* a non-empty `checklist`. `userId` in the body is ignored — always overridden with the verified identity. | `string` — `'Success'` or a Mongoose validation error message. |
| `PATCH /update/:id` | user | `{ edit, text, date, star, tags?, checklist?, <legacy fields>? }` — `updateNoteSchema`. `tags`/`checklist` are each only applied when present in the request — omitting one leaves that field untouched, not wiped. | The updated `Note`. |
| `DELETE /delete/:id` | user | — | `'Delete Notes'`. Scoped by `userId` — can't delete another user's note by guessing its `_id`. |
| `POST /upload` | user | `{ note: string }` (max 50,000 chars) — `uploadNotesSchema`. Parsed into individual notes by `middleware/upload.ts`. | `200` if every note imported successfully, `207` (partial success) if some failed — `{ message, successCount, failureCount }` either way. |
| `POST /aggregateNoteyears` | user | — | `[string]` — the single oldest year with at least one note (used to bound the year picker). |
| `GET /recentlyUpdated` | user | — | `Note[]`, sorted by `updatedAt`. |
| `GET /analytics/tags` | user, cached 600s | — | `TagAnalyticsResult[]` — per-tag count + average star rating across a user's full history. |
| `GET /analytics/timeseries` | user | query: `granularity` (`week`\|`month`\|`year`, default `month`), `count` (capped at 52/36/10 respectively) | `TagTimeSeriesResult` — per-bucket counts for the top 6 most-active tags. |
| `GET /analytics/heatmap` | user | query: `tag?` | `HeatmapResult` — 364 days of daily counts (GitHub-contribution-graph-style), optionally filtered to one tag. |
| `GET /analytics/streaks` | user, cached 600s | — | `TagStreakResult[]` — current/longest streak per tag (top 6). |
| `GET /analytics/dayofweek` | user, cached 600s | — | `DayOfWeekPatternResult` — per-tag counts bucketed Sun–Sat. |
| `GET /analytics/seasonality` | user, cached 600s | — | `SeasonalityResult` — per-tag counts bucketed Jan–Dec, summed across years. |

Every write route (`PATCH /update/:id`, `DELETE /delete/:id`, `POST /note`,
`POST /upload`) fires `invalidateUserAnalyticsCache(userId)` (fire-and-forget) so the
five cached analytics endpoints above don't serve stale data after a note changes.

## Users (`/api/users`)

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `GET /callback` | JWT only (no `requireAuth`) | — | `200`. Auth0's post-login callback target — just needs a valid token to confirm login succeeded, not a resolved `userId`. |
| `POST /user` | user | `{ user: { email } }` — `getUserSchema` | `{ searchedUser: User }`. **Auto-provisions** a new `User` document on first login if none exists yet — this is the app's only "signup" path. |
| `POST /user/trackedstats` | user | `{ user: { email }, trackedStats: { icon, name, visible } }` — `trackedStatsSchema` | The updated `User`. |
| `GET /admin/users` | admin | — | `User[]` — every user in the system. |
| `DELETE /user` | user | — | `204`. Deletes the account. |
| `GET /user/export` | user | — | `200`, `Content-Disposition: attachment` — the full account data export (GDPR-style "download your data"), as JSON. |
| `POST /user/onboarding-seen` | user | — | `204`. Marks the one-time compose-form demo as seen. |

## Notifications (`/notifications`)

Push notification subscriptions and preferences (web-push).

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `GET /vapid-public-key` | user | — | `{ publicKey: string }`, or `503` if push isn't configured on this server. |
| `POST /subscribe` | user | `{ endpoint, keys: { p256dh, auth } }` | `{ success: true }`. |
| `POST /unsubscribe` | user | `{ endpoint }` | `{ success: true }`. |
| `POST /preferences` | user | `{ enabled, reminderHour (0-23), timezoneOffsetMinutes }` | `{ success: true }`. |
| `GET /preferences` | user | — | The user's `notificationPreferences`, or a disabled default if none set. |
| `POST /test` | user | — | Sends an immediate test push to every subscription on the account; `400` on failure with the underlying error message. |

The hourly cron job in `server.ts` (`sendDueReminders`) independently sends reminders
to any user whose `reminderHour` (adjusted for `timezoneOffsetMinutes`) matches the
current hour — not an API route, but worth knowing about when reasoning about this
router.

## Contact (`/contact`)

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /submit` | **public** — IP rate-limited (5/15min) instead | `{ email, message }` (max 2000 chars) — `contactFormSchema` | `201 { status: 'ok' }`. |
| `GET /submissions` | admin | — | `ContactSubmission[]`, newest-first. |

## Health

| Method & path | Auth | Response |
|---|---|---|
| `GET /health` | public | `200 { status: 'ok', database: 'connected' }`, or `503 { status: 'unhealthy', database: 'disconnected' }`. Checks Mongoose's actual connection state — a process that's technically up but has lost its DB connection reports unhealthy, not a false-positive 200. |
