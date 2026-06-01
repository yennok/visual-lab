# Troubleshooting — Visual Lab (local dev)

A log of issues hit during local development and exactly how they were fixed,
so they're fast to resolve if they recur. Newest/most-painful first.

---

## 1. Vercel Blob: "Access denied, please provide a valid token for this resource"

**Symptom:** `Generate` (or any upload) fails with
`Vercel Blob: Access denied, please provide a valid token for this resource.`
even though `BLOB_READ_WRITE_TOKEN` in `.env.local` is correct and a standalone
`put(..., { token })` upload with that exact token **succeeds**.

**Root cause:** `@vercel/blob` resolves credentials in this priority order when
you call `put()` / `handleUpload()` **without** an explicit `token`:

1. explicit `token` option
2. **`VERCEL_OIDC_TOKEN`** — used when `BLOB_STORE_ID` is also set
3. `BLOB_READ_WRITE_TOKEN`

Our env had a (stale) `VERCEL_OIDC_TOKEN` **and** `BLOB_STORE_ID`, so the
library used OIDC auth — never the valid read-write token. `VERCEL_OIDC_TOKEN`
is short-lived (~12h) and meant for Vercel's deploy runtime, not local dev, so
it was expired → "Access denied". (The 22-char token prefix `vercel_blob_rw_…`
is just the store id, shared by every token for the store, so a stale token
looks identical to a good one — don't trust the prefix.)

**Fix (in code, permanent):** pass the read-write token explicitly at every Blob
call site via the `blobReadWriteToken()` helper:

- `src/lib/blob.ts` — returns `process.env.BLOB_READ_WRITE_TOKEN`
- `src/app/api/generate/route.ts` — `put(..., { token: blobReadWriteToken() })`
- `src/app/api/blob/upload/route.ts` — `handleUpload({ token: blobReadWriteToken(), ... })`

**Alternative fix (env hygiene):** remove the stale `VERCEL_OIDC_TOKEN` line from
`.env.local` / `.env` so the library falls back to `BLOB_READ_WRITE_TOKEN`.

**Fast diagnosis if it recurs:** compare what the running server uses vs. what's
in the file, and test both paths from inside the server runtime — implicit
`put()` failing while explicit `put(..., { token })` succeeds is the signature
of this bug.

---

## 2. Local dev crashes the whole machine (kernel panic / freeze) while compiling

**Symptom:** Mac freezes/reboots right when the dev server starts `Compiling …`.
Panic log shows `watchdog timeout` + `Compressor … 100% of segments limit (BAD)`
+ many swapfiles → **out of memory**, not a hardware fault.

**Root cause:** the default **Turbopack** dev compiler spiked memory until the
system ran out of RAM.

**Fix:** use the webpack compiler + memory options.

- `package.json` → `"dev": "next dev --webpack"`
- `next.config.ts` → `experimental: { webpackMemoryOptimizations: true, preloadEntriesOnStart: false }`

Confirm the banner says `▲ Next.js … (webpack)`, not Turbopack. webpack compiles
a bit slower but won't exhaust RAM. Also helps to close other heavy apps
(Chrome with many tabs, etc.) during compile.

---

## 3. PrismaClientInitializationError: "Timed out fetching a new connection from the connection pool"

**Symptom:** pages that hit the DB fail with a pool timeout (timeout 10s,
connection limit 21), often after the app has been idle a while. The DB host is
reachable (TCP connects fast) and connecting with a longer timeout succeeds.

**Root cause:** the database (Neon, via `POSTGRES_PRISMA_URL`) **auto-suspends
when idle**; the first connection after a cold start can take longer than
Prisma's default 10s pool / 5s connect timeout.

**Fix:** `src/lib/db.ts` appends `connect_timeout=30` & `pool_timeout=30` to the
datasource URL (`withColdStartTimeouts`) so the wake-up doesn't lose the race.
If it still times out on the very first hit, just reload — the failed attempt
wakes the DB.

---

## 4. "Next.js inferred your workspace root" + stale env / wrong token

**Symptom:** startup warning about multiple lockfiles selecting
`/Users/<you>/package-lock.json` (your home folder) as the workspace root;
weird env behavior.

**Root cause:** stray files in the **home directory** (`~/package-lock.json`,
`~/.env`, `~/.env.local`) made Next treat the home folder as the project root
and load the wrong env.

**Fix:** move the stray home-folder files out of the way (they don't belong
there). The warning should disappear and only the project's `.env.local` / `.env`
load. (Env load order, highest first: `process.env` → `.env.development.local` →
`.env.local` → `.env.development` → `.env`.)

---

## 5. Hydration warning from browser-extension attributes on `<body>`

Fixed in code (suppressed the benign warning caused by extensions injecting
attributes). Not a real bug.

---

### General "clean restart" recipe (clears stale servers & env)

```bash
pkill -f "next dev"          # kill any leftover dev servers
# open a fresh terminal tab
cd /path/to/visual-lab
unset BLOB_READ_WRITE_TOKEN  # drop any token stuck in the shell
npm run dev
```
