# Visual Lab

Hosted, multi-tenant SaaS for generating brand-consistent images with Gemini
("Nano Banana Pro"). A brand signs up, configures its visual identity once, and
generates on-brand images forever. Free trial → paid subscription, image quota,
B2B org model (clients → campaigns).

## Status: Phase 0 (foundation)

A deployed, authenticated, empty Next.js shell with a working DB and Blob store.
No image generation yet (Phase 1), no payments (Phase 2). A user can sign up,
land on `/app`, and see a placeholder.

## Stack

- **Next.js 16** (App Router) + TypeScript — `src/` layout
- **Tailwind CSS v4** — neutral chrome; per-brand tokens overlay via CSS vars in `src/app/globals.css`
- **Clerk v7** — auth (`<Show when="signed-in|signed-out">`, `clerkMiddleware`)
- **Prisma v6 + Postgres** — Vercel Postgres or Neon
- **Vercel Blob** — image storage (wired in Phase 1)
- **`@google/genai`** — Gemini client (`src/lib/gemini.ts`, not called until Phase 1)
- **Vercel** — hosting

> Versions differ from the original kickoff plan (Next 15 / Prisma «classic» /
> Clerk «classic»): `create-next-app@latest` produced Next 16 + Tailwind v4 +
> Clerk 7 + Prisma 7. Prisma is pinned to **^6** (Prisma 7 moved connection URLs
> out of `schema.prisma`), and the Clerk gating uses v7's `<Show>` instead of the
> removed `<SignedIn>/<SignedOut>`.

## Layout

```
src/
  middleware.ts              Clerk route protection (/app, /onboarding, /api/generate)
  app/
    layout.tsx               ClerkProvider + html shell
    globals.css              Tailwind v4 + brand-token CSS variables
    (marketing)/page.tsx     Public hero / landing
    app/                     Authenticated workspace (/app) — gated
      layout.tsx             Sidebar chrome
      page.tsx               Workspace stub
    onboarding/page.tsx      Post-signup stub
    sign-in/[[...sign-in]]   Clerk sign-in page
    sign-up/[[...sign-up]]   Clerk sign-up page
    api/generate/route.ts    Auth-gated stub (501 until Phase 1)
  lib/
    db.ts                    Prisma client singleton
    gemini.ts                Gemini image client (ported, not yet called)
    brand-prompt.ts          Brand prompt builder (parameterized port of LAB2 lab2mode)
prisma/schema.prisma         Full data model (User, Brand, Reference, Client, Campaign, Generation, FeatureRequest)
.env.example                 Copy to .env.local and fill in
```

## Local development

```bash
cp .env.example .env.local      # then fill in the values (see below)
npm install
npx prisma generate
npm run dev                      # http://localhost:3000
```

## Remaining Phase 0 setup (needs human accounts / keys)

These steps require external accounts and secrets and must be run from a machine
that's logged in — they can't be done from the CI/agent container.

1. **Clerk** — create an application at clerk.com, copy the Publishable + Secret
   keys into `.env.local`.
2. **Vercel** — `npm i -g vercel && vercel link`.
3. **Postgres** — in the Vercel dashboard: Storage → Create → Postgres → connect.
4. **Blob** — Storage → Create → Blob → connect.
5. **Pull env + migrate:**
   ```bash
   vercel env pull .env.local
   npx prisma migrate dev --name init
   npx prisma generate
   ```
6. **Deploy:** `vercel --prod`.

## Phase 0 done-when checklist

- [ ] `npm run dev` renders the marketing page at `localhost:3000`.
- [ ] "Start free trial" → Clerk signup → redirect to `/onboarding`.
- [ ] `/app` is gated — unauthenticated users bounce to sign-in.
- [ ] `vercel --prod` deploys; production URL behaves the same.
- [ ] `npx prisma studio` shows empty tables; inserting a User row works.
- [ ] `BLOB_READ_WRITE_TOKEN` set; a test `put()` from `@vercel/blob` returns a URL.
- [x] `src/lib/gemini.ts` compiles; no runtime call yet (Phase 1).
- [x] `npm run build` passes (typecheck + production build).

## Next (Phase 1 — do not start until Phase 0 is green)

Wire `/api/generate` end to end (Gemini → Blob → `Generation` row); port the
`Composer`, `Gallery`, `DetailDrawer` from `Lab2-Claude/tools/image-studio`.
