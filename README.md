# US — a little place for two

A private PWA for two people. Instead of chat bubbles, messages arrive as small digital gestures: a sealed envelope, a taped note, a beating heart, a hug in words, a secret that waits for the seal to break, or an old parchment letter with a red wax seal. Any message can carry a short song clip. Notifications are real Web Push (VAPID), not in-page toasts.

## What it does

- **Quick message:** type a line on Home, send, and it lands on their lock screen **with your words** (their notification privacy can be switched to a generic line in Settings).
- **Thinking of you:** one tap, no words.
- **Letters with ceremony:** Love Letter, Little Note, Heart Message, Hug in Words, Secret Message and Old Letter (parchment, quill, red wax seal). Any message can carry a **song clip** and can be **scheduled** as a time capsule that opens on a chosen morning.
- **Voice notes and drawings.** A drawing arrives whole on Home (tap for full screen) and, on Android, as the big picture of the notification.
- **Your person, drawn by you:** each of you builds a character of the other (CC0 Lorelei art, 48 hairstyles, glasses, beard, freckles…). It lives on your Home screen, breathes and blinks, shows their mood, and you can see how they drew you.
- **A full-screen portrait of your person** (`/us/portrait`, also an app-icon shortcut on Android) with their mood, their local time and a send box right there.
- **Jar of reasons** (pull a slip, plus a reason of the day on Home) and **"Open when…" letters** sealed until the right moment.
- **Together:** days-together counter, plans and anniversaries with countdowns (plus automatic 100/200/365-day milestones), our story timeline with photos, albums, a daily question (answers unlock when you both reply), dreams and bucket list, love coupons, and a shared playlist.

> The product name lives in one place: [`src/config/brand.ts`](src/config/brand.ts). All UI copy lives in [`src/content/en.ts`](src/content/en.ts) (swap `src/content/index.ts` to add a translation).

## Status at a glance

| Area | Implemented | Verified here | Needs your setup |
| --- | --- | --- | --- |
| Sign up / in / out, password reset | yes | against a **mock** auth server only (session handling) | Supabase project, redirect URLs |
| Invite + link two people (one-time, 48h, 2-member cap) | yes (SQL + UI) | **SQL tests on real Postgres 16** | – |
| Send / read / react / history / search | yes | SQL tests on Postgres; UI against a **mock** API | – |
| Row Level Security, minimum privilege | yes | **SQL tests on Postgres 16** (95+ assertions) | apply migration |
| Six distinct message experiences + previews (incl. Old Letter) | yes | visually reviewed in headless Chromium | – |
| Song clip attached to a message (search, pick the part, play on open) | yes | DB rules + parsing tested; **never run against the live Apple API or on a phone** | – |
| Web Push send (VAPID + RFC 8291 encryption) | yes | **against a local HTTPS push-service stand-in** | VAPID keys, service-role key |
| Push subscribe/unsubscribe, notification click → letter | yes | code reviewed; **not run on a real phone** | VAPID keys, HTTPS |
| PWA manifest, service worker, offline page | yes | manifest/headers checked on a production server | HTTPS in production |
| Quick message, ping, voice notes, drawings, time capsules | yes | DB rules on Postgres; UI against a **mock** API; **recording and audio never tried on a real phone** | – |
| Characters, mood, days together, plans, story, daily question, dreams, coupons, playlist | yes | DB rules on Postgres; UI against a **mock** API | – |
| Albums + private photo storage | yes | storage policies tested on Postgres with a stand-in for Supabase Storage; **never run against real Supabase Storage** | – |
| Daily job (capsule delivery, reminders) | yes | secret check unit-tested; **job itself never run** | `CRON_SECRET`, Vercel Cron |
| Production build, lint, typecheck | yes | all pass (see below) | – |

Not verified: anything against a live Supabase project, real browser push services (FCM / Mozilla / Apple), iOS Home-Screen behaviour, or delivery on real devices. Treat those as "implemented, untested end-to-end" until you run the smoke test below.

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript strict · Tailwind CSS 4 · Framer Motion · Supabase (Auth, Postgres, RLS) · `web-push`. Fonts are self-hosted via Fontsource (no third-party font requests).

Why Route Handlers + Server Actions instead of Supabase Edge Functions: the only privileged work (sending push, deleting an account) is a few lines running next to the app, and keeping it there means one deployment and one set of secrets. The service-role key is used in exactly two places: [`src/server/push.ts`](src/server/push.ts) callers and account deletion.

## Project structure

```
supabase/
  migrations/20260101000000_init.sql   schema, RLS, grants, all RPC functions
  tests/                               SQL harness + permission tests (real Postgres)
src/
  app/
    (auth)/ login, register, forgot-password, reset-password
    (app)/  home, write, letters, letters/[id], connect, settings, install  (signed-in shell + bottom nav)
    welcome/ join/[token]/ offline/ setup/ auth/callback/
    actions/   server actions (auth, couple, messages, settings)
    api/push/  subscribe (POST/DELETE) and test (POST)
    manifest.ts
  components/
    letters/   LoveLetter, LittleNote, HeartMessage, HugInWords, SecretMessage (+ MessageExperience)
    write/ home/ settings/ connect/ auth/ ui/
  lib/        validation (zod), notifications (payload builder), push-client, supabase clients, env
  server/     queries, guards, push sender
  proxy.ts    session refresh + route protection
public/sw.js  service worker (push, offline page, static asset cache only)
scripts/      test-db.sh, generate-icons.mjs, generate-vapid.mjs
```

## Run locally

Requirements: Node 20.9+, a Supabase project (free tier is fine). A local Supabase via the CLI also works (`supabase init` → `supabase start`; the migration is plain SQL) but was not tested here.

```bash
npm install
cp .env.example .env.local        # then fill it in (below)
npm run vapid                     # prints a VAPID key pair; copy both values into .env.local
npm run dev                       # http://localhost:3000
```

Without Supabase variables the app still builds and starts, and redirects to a `/setup` page that lists what is missing.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon/publishable key (safe in the browser; RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | public | Origin used for invitation links and auth redirects, no trailing slash |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | VAPID public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Reads push subscriptions / recipient preferences, deletes accounts |
| `VAPID_PRIVATE_KEY` | **server only** | Signs push requests |
| `VAPID_SUBJECT` | server | `mailto:` or `https:` contact for push services |
| `CRON_SECRET` | **server only** | Long random string (16+ chars). Vercel Cron sends it to `/api/cron/daily`; without it the job refuses to run |

`NEXT_PUBLIC_*` values are inlined at **build** time, so set them before `npm run build`. Never prefix a secret with `NEXT_PUBLIC_`. Nothing secret is committed; `.env*` is git-ignored except `.env.example`.

## Configure Supabase

1. Create a project at supabase.com.
2. **Schema:** apply the files in [`supabase/migrations/`](supabase/migrations/) **in order** — paste each into the SQL editor, or use the CLI: `supabase init && supabase link --project-ref <ref> && supabase db push`.
   - **Applied only `init` and `old_letter_and_song`?** Paste [`supabase/bundles/after-02.sql`](supabase/bundles/after-02.sql): everything newer, in one transaction.
   - **Already applied the earlier `after-02.sql` (through the albums/media release)?** Paste only [`supabase/bundles/after-07.sql`](supabase/bundles/after-07.sql) (jar of reasons, open-when letters, time zones). Never paste both.
   - Regenerate the bundles with `npm run sql:bundle`.
   - The bundle also creates the private **`couple-media`** storage bucket and its policies (needs the Storage service enabled, which is the Supabase default).
3. **Auth → URL Configuration:** set *Site URL* to your `NEXT_PUBLIC_SITE_URL` and add `<site>/auth/callback` to *Redirect URLs* (needed for email confirmation and password reset). Open those emailed links on the same device/browser that requested them (PKCE).
4. **Auth → Providers → Email:** keep email/password on. Decide whether to require email confirmation (the app handles both). Set a sensible minimum password length (the app enforces 8).
5. **Auth → Rate limits / SMTP:** the built-in mailer is heavily rate-limited; configure your own SMTP before real use.
6. Copy the project URL, anon key and service-role key into your environment (Project Settings → API).

The migration revokes default table/function privileges and grants only what is needed. All writes go through `SECURITY DEFINER` functions that read `auth.uid()` and ignore any client-supplied identity.

## Song clips

A message can carry a song: the sender searches by name, picks a track and chooses which part (3–30 s of the 30 s preview) plays. It starts when the recipient opens the message (the tap that opens the seal is the moment browsers allow sound) or when they press play.

- Audio comes from the free Apple iTunes Search/Lookup API previews, played straight from Apple's servers; nothing is copied or stored by us except title, artist, artwork link and the chosen range. The server re-fetches the track from Apple instead of trusting the browser, and the database accepts only `https` URLs on `itunes.apple.com` / `mzstatic.com`.
- **Limits:** only 30-second previews, and only songs Apple offers a preview for (varies by country). A song cannot start by itself when a notification arrives: phones block sound until the person touches the screen, and web push notifications cannot play custom sounds. Search is rate limited (30 per 10 minutes).
- Not verified here: the sandbox could not reach `itunes.apple.com`, so the live API call and real audio playback on phones are untested.

## Configure Web Push

1. `npm run vapid` → set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
2. Serve over **HTTPS** (push requires a secure context; `localhost` is allowed for development). The service worker is only registered in production builds (`npm run build && npm start`), so test push against a production build.
3. Signed in, go to **Settings → Notifications → Turn on notifications on this device** (the permission prompt appears only on that click), then **Send me a test notification**.
4. **iPhone/iPad:** Web Push needs iOS/iPadOS 16.4+ and the app added to the Home Screen first. The in-app **Install** guide explains the steps and Settings explains why notifications are unavailable when it detects Safari without installation. **Android:** Chrome (install optional). Unsupported browsers keep working without notifications.

Behaviour worth knowing: `push_status` on a message means the push service *accepted* the request, not that the phone showed it. A message is only marked read when the recipient actually opens it in the app, never because a notification was sent. Expired subscriptions (404/410) are deleted automatically; five consecutive failures also prune a device. A notification's `tag` is the message id, so retries can't stack duplicates.

## Deploy

Any Node host works; Vercel is the simplest.

1. Push this repo, import it, and set all environment variables above (public ones **before** the first build).
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin and mirror it in Supabase Auth URL settings.
3. Icons are committed (`npm run icons` rebuilds them from `scripts/generate-icons.mjs`).
4. Smoke test with two real accounts (below).

### Automatic deploys

Connect the repo in Vercel and set **Settings → Environments → Production → Branch Tracking** to the branch you deploy from. Every push to that branch is then published to production automatically. Vercel never touches the database: when a release adds SQL, apply it in Supabase **before** pushing the code.

### Daily job (time capsules and reminders)

[`vercel.json`](vercel.json) schedules `GET /api/cron/daily` once a day at 07:00 UTC (the most frequent schedule Vercel's free plan allows). It (1) sends the notification for time capsules that opened, and (2) announces today's and tomorrow's plans, anniversaries and milestones to both people. Set `CRON_SECRET` in Vercel, then redeploy. Capsules become visible at 06:00 UTC on the chosen date, so the notification arrives within about an hour.

### Two-account smoke test (run this once after deploying)

1. Account A registers → **Create invitation** → copies the link.
2. Account B (different browser/device) opens the link, registers, **Accept and join**. Both land on Home.
3. A writes a Love Letter → Preview → Send. A sees "Sent with care".
4. B (app installed, notifications on) receives a notification; tapping it opens `/letters/<id>`; B opens the seal, reacts, replies.
5. A sees "Opened" and B's reaction on the letter. Reload both sides: letters persist in **Our letters**.
6. Try the same invitation link with a third account: it must say the invitation is no longer valid.

## Tests and checks

```bash
npm run lint        # ESLint (Next + React rules)
npm run typecheck   # tsc --noEmit (strict)
npm test            # Vitest: validation, notification privacy, invite parsing, redirects, CSRF guard, real Web Push send
npm run test:db     # applies the migration to a throwaway local Postgres and runs the permission tests
npm run build       # production build
```

`test:db` needs PostgreSQL server binaries (it auto-detects `/usr/lib/postgresql/*/bin`; set `PGBIN` otherwise) and creates stand-ins for the Supabase-managed `auth` schema and roles ([`supabase/tests/00_stubs.sql`](supabase/tests/00_stubs.sql)). It exercises: signup trigger, anon lockout, invitation hashing/expiry/revocation/single-use, 2-member cap, cross-couple isolation, forged sender/recipient, idempotent sending, content limits, rate limits (including that failed invitation guesses are counted), read/react authorization, push-key column privileges, leaving a space, and account deletion cascade.

## Performance

Each page makes **one wave** of parallel database requests (session check is verified locally from the token, not with a trip to the auth server; the profile, partner and space load together; layout and page data travel side by side). With 100 ms of simulated latency per backend request this took pages from about 530–650 ms to about 120–140 ms. Navigation shows a skeleton immediately (`loading.tsx`).

**The biggest remaining factor is distance.** Put the Vercel function region next to your Supabase region: Supabase → *Project Settings → General → Region*, then Vercel → *Project → Settings → Functions → Function Region*, and redeploy. If they are on different continents every request pays an ocean crossing.

## Privacy and security model

- **Authorization is in the database.** RLS lets only the two members of a space read its messages; clients cannot insert/update/delete messages, members, invitations or push keys directly. Changing the id in a URL yields "not found".
- **One partner, safely.** `unique(user_id)` on membership + a locked trigger cap a space at two people. A user in a couple can't accept another invitation; leaving is explicit (type `LEAVE`).
- **Invitations:** ~150-bit random tokens (40 hex chars from the database CSPRNG), only their SHA-256 hash is stored, 48-hour expiry, single use, a new link revokes the old one, all attempts rate-limited (10 per 10 minutes) with generic failure responses.
- **Rate limits:** 30 messages / 10 min, 5 invitations / hour, 10 join attempts / 10 min, 3 test notifications / 10 min.
- **Notifications:** default "Private" shows only a warm generic line, with no content and no sender name on the lock screen. "Show the message" is opt-in.
- **Web hardening:** security headers, same-origin check on cookie-authenticated JSON endpoints, open-redirect-safe `next` handling, no private content in the service-worker cache, no letter text in logs.

### Known limitations (read these)

- **Not end-to-end encrypted.** Letters are stored as text in your Supabase database (encrypted at rest by the provider). Whoever operates the database/project can read them. The app says so in Settings.
- Database **backups** may retain deleted letters for the provider's retention window.
- Leaving a space: the person who stays keeps read-only access to the letters; when the last person leaves, the space and all letters are deleted. Deleting an account deletes the letters you wrote and received.
- Push delivery is best-effort and depends on the OS, browser, battery settings and connectivity. No instant-delivery promise.
- **Offline:** the app never caches letters. Offline you get an explanatory page; the composer keeps a draft on the device and refuses to "send" until you are back online (so nothing ever looks sent when it isn't). There is no background send queue.
- Realtime updates are not implemented: new letters appear on next navigation/refresh/notification tap.
- Avatars are an optional https link (no upload/storage yet).
- Email recovery links use PKCE: open them on the same browser that requested them.
- **Photos, voice notes and drawings** are private to the couple (storage policies + short-lived signed links) but, like letters, **not end-to-end encrypted**. Photos are resized on the device and lose location metadata before upload. Voice recording needs microphone permission and works in current Chrome/Safari; not tested on real devices here.
- When the last person leaves or an account is deleted, files are removed through the Storage API; the other person keeps shared files if they stay. Provider backups may retain them for a while.
- Time capsules open at 06:00 UTC on the chosen day regardless of time zone.
- Daily question and reminders use UTC calendar days.
- Characters use the open-source Lorelei style, so they resemble a person but are not a likeness from a photo.
- **There is no home-screen widget:** installed web apps cannot provide native iOS/Android widgets. The closest things are the full-screen portrait, the unread number on the app icon (`setAppBadge`, where supported) and the Android long-press shortcuts.
- A notification picture (drawings) only shows on Android Chrome; iOS ignores it, and it is only sent in the "show the message" privacy mode.
- Your person's local time appears once they have opened the app (it shares the device's time zone).
- Songs are 30-second previews only (see *Song clips*); no autoplay before the first tap.
- English only for now (copy is centralised for translation).

## Pending / ideas

Realtime inbox, uploading your own image as the character, avatar upload, shared calendar sync, background-sync outbox, Spanish translation, a SQL test for concurrent accept races, Playwright E2E against a real Supabase project, and reading push delivery receipts.
