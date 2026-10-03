# Contributing

## Local setup

See the [README](../ReadMe.md#local-development) for installing dependencies and
required environment variables. The short version:

```bash
# Server
cd server
npm install
cp config/config.example.json config/config.json  # or use env vars (preferred — see below)
npm run dev

# Client (separate terminal)
cd client
npm install
npm start
```

`config.json` is gitignored and never committed — it's a local convenience for dev.
Env vars always take priority over it (`checkJwt.ts`, `validateEnv.ts`), which is
what an actual deploy uses (Heroku config vars), so a fresh CI checkout or a new
container has no dependency on a file that was never checked in.

## Before opening a PR

Run the same checks CI runs (see [CI/CD](#cicd) below for the exact commands) —
catching a failure locally is faster than waiting on a CI run:

```bash
cd server && npx tsc --noEmit && npm run lint && npm test && npm audit --omit=dev --audit-level=high
cd client && npx tsc --noEmit && npm run lint && CI=true npm test -- --watchAll=false && npm run build
```

The server test suite needs `mongodb-memory-server`, which downloads a real MongoDB
binary on first run — this needs real network access and will fail in a sandboxed
environment with no outbound access to `fastdl.mongodb.org`. That's an environment
limitation, not a code problem; CI always has network access.

Client-side test coverage is a known gap (unit tests exist for `utils/`, not yet for
components) — new `utils/` logic should come with tests; new components aren't
blocked on it yet, but adding them is welcome.

## Code conventions

- **TypeScript strict, no `any` as an escape hatch.** Prefer a real type or a narrow
  `unknown` with a type guard.
- **Comments explain *why*, not *what*.** The codebase leans heavily on comments
  that record a decision, a bug a piece of code is guarding against, or a subtlety
  that isn't obvious from the code alone — not restating what the next line does.
  Match that style rather than removing comments or adding ones that just narrate.
- **Minimal, targeted diffs.** Prefer fixing the actual root cause over a broad
  rewrite — e.g. the checklist-persistence bug was one missing field in a
  destructure, not a sign the route needed restructuring.
- **Validation lives at the API boundary (Zod), not scattered through controllers.**
  See [DATA_MODEL.md](./DATA_MODEL.md#validation-vs-the-mongoose-schema) for why
  there are two validation layers and what each one is actually for.
- **Ownership scoping.** Every query that reads/writes a user's own data filters by
  `userId` (or `requireAdmin` for the few routes that legitimately cross that
  boundary) — never trust a client-supplied id alone.

## Testing patterns worth knowing

- **Route-level tests, not just schema/controller tests, for anything that flows
  request body → route handler → controller.** A Zod schema test proves a shape is
  *accepted*; it can't catch a route handler that validates a field correctly but
  then forgets to forward it to the controller (exactly what happened with
  `checklist` in `PATCH /notes/update/:id`). `server/__tests__/notes.routes.test.ts`
  exercises the real Express router with `supertest` against a real in-memory
  database for this reason.
- **Real browser layout for anything CSS/overflow-dependent.** `jsdom` (Jest's
  default DOM) doesn't compute real `scrollWidth`/`ResizeObserver` behavior. For
  that, bundle a standalone entry with `esbuild --bundle --jsx=automatic` (run from
  *inside* the target package directory, to avoid duplicate-React-copy "Invalid hook
  call" errors from mismatched module resolution) and drive it with Playwright. Not
  a permanent test suite — a one-off verification technique for layout-sensitive
  changes; don't leave the scratch entry file behind.
- **Server tests needing a real database** use `mongodb-memory-server` via
  `__tests__/helpers/db.ts` (`connect`/`clearDatabase`/`closeDatabase`).

## Git workflow

- Feature work happens on a branch off `develop`, merged back via PR.
- `master` is production; `develop` is staging (auto-deployed — see below).
- Create new commits rather than amending/force-pushing shared history.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to `master`/`develop`:

- **`server-checks`** — type-check (`tsc --noEmit`, whole project, not just what a
  test's import graph happens to reach), lint, the full test suite with coverage,
  `npm audit --omit=dev --audit-level=high` (**blocking** — scoped to production
  dependencies, which the Dockerfile also prunes down to; the server is verified
  clean at 0 vulnerabilities there across every severity, so this guards against a
  future dependency actually reintroducing one, not a known-and-ignored finding.
  Dev-only tooling like `nodemon`, used solely by local hot-reload, is excluded —
  it never ships in the production image, so a new advisory against it with no fix
  yet shouldn't block every deploy).
- **`client-checks`** — type-check, lint, test suite with coverage, `npm audit`
  (**non-blocking** — reviewed directly: the client's findings are almost entirely
  build/test-time-only tooling that never ships to a real browser, plus a
  react-router finding that isn't reachable given how routing is used here; revisit
  if/when the react-router major-version migration happens), and a production build.
- **`docker-build`** — builds the real `server/Dockerfile` (the same one both deploy
  jobs use, not a separate `docker compose build` definition that could drift),
  boots it against a real ephemeral MongoDB service container, and polls `/health`
  until it reports a genuinely connected database — a real smoke test, not just "the
  image assembled". Runs on PRs too (previously gated to pushes only, letting a PR
  merge without ever actually proving the image boots).
- **`deploy-dev`** — on every push to `develop` (after all checks above pass):
  builds and pushes the image to Heroku's Container Registry, releases it to the dev
  app. No approval gate — fast feedback, standard "staging auto-deploys" setup.
- **`deploy-prod`** — only on a **manual** `workflow_dispatch` run against `master`.
  Required-reviewer approval gates need GitHub Pro/Team on a private repo, which this
  isn't on; a human manually triggering the deploy is the free equivalent of "someone
  has to consciously decide to ship" — there's no "happens automatically unless
  someone objects" path to production at all.

A superseded run on the same branch/PR is automatically cancelled when new commits
land, rather than continuing to burn CI minutes.
