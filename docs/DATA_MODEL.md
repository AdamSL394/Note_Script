# Data model

Four Mongoose collections. Schemas live in `server/models/`; the matching Zod
request-body schemas live in `server/validation/schemas.ts` (see
[Validation vs. the Mongoose schema](#validation-vs-the-mongoose-schema) below — they
serve different purposes and are deliberately not identical).

## Note

`server/models/notes.ts`. The core document — a journal entry that can hold
free-text, a checklist, or both.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string`, required | Owner. Every query that reads/writes a note is scoped by this, not just `_id` — see [requireAuth and ownership scoping](./ARCHITECTURE.md#server). |
| `text` | `string`, default `''` | Not required at the schema level — a note may be checklist-only. (Mongoose's `required` on a String rejects empty string, not just missing, so this is `default: ''` rather than `required: true`.) |
| `date` | `string`, required | `'YYYY-MM-DD'`. Stored as a string, not a `Date` — see the regex in `validation/schemas.ts`'s `dateString`. |
| `star` | `string`, default `'None'` | One of `'None' \| '1' \| '2' \| '3'`. **Not boolean** — some pre-migration documents may still hold a legacy boolean `false`; both the client (`sanitizeStarValue`) and server (`star: note.star \|\| 'None'` in `noteRoutes.ts`) normalize this before it round-trips, since the server's Zod enum would otherwise reject the *entire* update request over an unrelated stale field. |
| `edit` | `boolean`, default `false` | Client-side UI state (is this note currently open for editing), persisted server-side so it survives a page reload mid-edit. Echoed back by every update — see [the note update flow](./ARCHITECTURE.md#note-update-flow). |
| `tags` | `ITagSnapshot[]`, default `[]`, max 40 | `{ name: string, icon: string }`. **Snapshotted at the moment the tag was applied**, not re-resolved against the user's current tag settings on every read — matches how an order snapshots a product's price/description at purchase time, so a note's tags stay visually stable even if the tag is later renamed or deleted from the user's settings. |
| `checklist` | `IChecklistItem[]`, default `[]`, max 40 | `{ text: string, checked: boolean }`. A note needs *either* non-empty `text` or at least one checklist item (enforced by `createNoteSchema`'s `.refine()`, not the Mongoose schema itself). |
| `look`, `gym`, `weed`, `code`, `read`, `eatOut`, `medal`, `king`, `'date/smoosh'`, `basketball` | `boolean`, default `false` | **Legacy.** Pre-`tags` flat boolean fields, kept (not deleted) as a safety net during the migration to `tags`. New code reads/writes `tags` exclusively; see [Legacy field reconciliation](#legacy-field-reconciliation) below. Safe to drop once production is confirmed fully migrated. |
| `updatedAt` | `Date`, default `Date.now` | Set explicitly on every update (not Mongoose's `timestamps` option). |

**Indexes:** a text index on `text` (full-text search), a compound `{ userId: 1, date: -1 }`
(covers every userId-scoped, date-sorted query — the large majority), and
`{ userId: 1, updatedAt: -1 }` specifically for `getMostRecentlyUpdatedNotes`, which
sorts by `updatedAt` rather than `date`.

### Legacy field reconciliation

`noteController.updateNote` accepts the old flat-boolean format (`look`, `gym`, ...)
alongside the new `tags` array, for the gap between a backend deploy and the client
actually sending `tags`. If the request includes `tags`, that's used as-is. If it
doesn't but includes any of the legacy boolean fields, they're reconciled into real
`ITagSnapshot` entries (`{ name: field, icon: <fixed icon> }`) on the way in. If
neither is present (e.g. the client only changed `text`/`star`), `tags` is left out
of the update entirely — deliberately **not** overwritten with `[]`, which would
silently wipe an existing note's tags.

## User

`server/models/user.ts`. One document per authenticated user, keyed by the Auth0
subject id (normalized — see `utils/userId.ts`).

| Field | Type | Notes |
|---|---|---|
| `_id` | `string` | The normalized Auth0 user id — not an auto-generated ObjectId. |
| `settings` | `ISetting[]`, default `[]` | `{ icon: string, name: string, visible: 'visible' \| 'hidden' }` — the user's tracked-stat/tag definitions shown in the compose form. |
| `email` | `string` | |
| `role` | `'user' \| 'admin'`, default `'user'` | The single source of truth for admin access — `requireAdmin` re-queries this on every request rather than trusting any client-supplied claim. |
| `notificationPreferences` | sub-document, default `{}` | `{ enabled: boolean, reminderHour: number (0-23, default 20), timezoneOffsetMinutes: number }` — drives the hourly cron reminder job. |
| `hasSeenOnboardingDemo` | `boolean`, default `false` | Tracked server-side (not `localStorage`) so the one-time compose-form typing demo plays once per *account*, not once per browser. |

A user document is auto-provisioned on first login (`POST /api/users/user` — see
[API.md](./API.md#post-apiusersuser)), not created through any explicit signup flow.

## PushSubscription

`server/models/pushSubscription.ts`. One document per browser subscription (a user
can have several, across devices/browsers).

| Field | Type | Notes |
|---|---|---|
| `userId` | `string`, required, indexed | |
| `endpoint` | `string`, required, **unique** | The push service URL; uniqueness is what prevents a duplicate subscription for the same browser. |
| `keys.p256dh` / `keys.auth` | `string`, required | Matches the shape `PushManager.subscribe()` returns via `.toJSON()` — used by `web-push` to encrypt the notification payload for this specific subscriber. |
| `createdAt` | `Date`, default `Date.now` | |

## ContactSubmission

`server/models/contactSubmission.ts`. One document per contact-form submission —
intentionally minimal (this is the one collection reachable by an unauthenticated
visitor).

| Field | Type | Notes |
|---|---|---|
| `email` | `string`, required | Validated as a real email format at the Zod layer (`contactFormSchema`), unlike every other `email` field in this app (see below). |
| `message` | `string`, required, max 2000 | |
| `createdAt` | `Date`, default `Date.now` | |

## Validation vs. the Mongoose schema

Two separate layers, deliberately not identical:

- **Zod (`validation/schemas.ts`), at the API boundary.** Rejects malformed/malicious
  request *shapes* before they ever reach Mongoose — this is the real fix for the
  NoSQL-injection class of bug (a client sending `{"text": {"$ne": null}}"` where a
  plain string was expected). Also enforces string length caps, the `'YYYY-MM-DD'`
  date format, the `star` enum, and a `RESERVED_TAG_NAMES` check (a tag can't be
  named `_id`, `userId`, `star`, `tags`, etc. — defense-in-depth now that tags live
  in an array rather than being able to overwrite a real top-level field, but kept
  anyway).
- **Mongoose, at the persistence boundary.** Casts/validates on `.save()`/`.create()` —
  catches anything a hand-written script or a future code path might send that skips
  the Express route entirely. `getUserSchema`'s `email` is deliberately a loose
  `z.string().min(1)` rather than `z.string().email()` — the goal there is rejecting
  type confusion, not policing RFC email format for a value Auth0 already owns.
  `contactFormSchema`'s `email` *is* `.email()`, since that one comes from an
  anonymous visitor typing into a form, not an identity provider.

A field can validate at both layers with different strictness (as above) or be
validated meaningfully at only one — `checklist`/`tags` array length caps (40 items)
are enforced at both, for instance, as a deliberate belt-and-suspenders.
