# 20 · Auth & Identity (Supabase)

> **Status: DRAFT, inert.** Every piece below is built, typechecked, and tested, but
> **does nothing until armed** — the app reads no Supabase env vars yet, so it stays
> the fully-keyless, local-first app it is today. Auth is one of the human-gated "irreversible
> five": the agent drafts, **a human arms it** (sets secrets + reviews + applies the migration).
> Arming checklist is at the bottom.

## Why this shape

- **Local-first stays the default.** Lar works with no account. Auth exists only to unlock
  **cross-device sync** of the already-end-to-end-encrypted store. Signing in never sends
  plaintext anywhere — the server holds **ciphertext only** (see `supabase/migrations/0001_lar_sync.sql`).
- **Passwordless.** Sign-in is an emailed one-time magic link (`signInWithOtp`). Lar never
  handles or stores a password — nothing to leak, nothing to phish. (Aligns with the
  never-enter-credentials rule.)
- **`getClaims()`, never `getSession()`** in server code. `getClaims()` verifies the JWT
  locally against the project JWKS; `getSession()` trusts an unverified cookie and must not
  gate anything server-side.
- **Fails closed.** `requireUser()` returns `401` when there's no verified user _or_ when auth
  isn't configured. A route that opts into auth can never accidentally serve an anonymous request.

## What's built

| File                                    | Role                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/supabase/config.ts`                | Call-time env guard `isSupabaseConfigured()`. Supports the new **publishable** key name and the legacy **anon** name. The single switch that keeps everything inert. |
| `lib/supabase/client.ts`                | Browser client (`createBrowserClient`). Throws if unconfigured — callers guard first.                                                                                |
| `lib/supabase/server.ts`                | Server client (`createServerClient`, Next 15 async `cookies()`).                                                                                                     |
| `lib/supabase/middleware.ts`            | `refreshSession()` — refreshes the session on the **existing** CSP response. No redirect; no-op when unconfigured.                                                   |
| `lib/supabase/auth.ts`                  | `requireUser()` server gate via `getClaims()`. Fail-closed `401`.                                                                                                    |
| `middleware.ts`                         | Appends `refreshSession()` after building the nonce-CSP response; adds the Supabase origin to `connect-src` **only when configured**.                                |
| `app/login/page.tsx`                    | Standalone `/login` route (not a dashboard tab). Inert "not live yet" card until armed.                                                                              |
| `components/SignInForm.tsx`             | Passwordless magic-link form.                                                                                                                                        |
| `app/auth/confirm/route.ts`             | Server-side `verifyOtp` of the email token → sets session → redirects home.                                                                                          |
| `app/auth/signout/route.ts`             | `POST` → `signOut()` (cookies are httpOnly).                                                                                                                         |
| `app/api/whoami/route.ts`               | Demo of the auth seam (401 while draft).                                                                                                                             |
| `supabase/migrations/0001_lar_sync.sql` | Ciphertext-only sync table + RLS + `lar_push`/`lar_pull` RPCs matching `SyncRemote`.                                                                                 |
| `lib/supabase/remote.ts`                | `supabaseRemote()` — client adapter implementing `SyncRemote` over those RPCs (ciphertext only). 6 tests vs a fake client. Inert until wired post-arming.            |

### The data model (RLS)

`public.lar_documents` stores one row per `(user_id, collection, id)`:

- `iv`, `ct` — AES-256-GCM ciphertext from the device. **Opaque to the server.**
- `updated_at` (bigint) — the store's monotonic logical clock; the **last-write-wins** key.
- `deleted` — tombstone. `seq` — global monotonic ordering, bumped on every write, for pull cursors.
- **RLS** restricts every operation to `(select auth.uid()) = user_id`. `lar_push` LWW-upserts a
  batch (overwrites only on a strictly-newer `updated_at`); `lar_pull(since)` returns the caller's
  changes after a cursor. Both are `security invoker`, so RLS still applies — defense in depth.

> The server sees routing metadata (`collection`, `id`) in clear — same as the `Change` wire
> shape — but **never** plaintext content. This matches `docs/19-sync-architecture.md`.

## Verification done as a draft

Typecheck clean · full suite **35/35** · `next build` **14/14** · lint clean. Boot smoke proved the
async middleware did **not** break the nonce-CSP→theme chain (inline `themeCss` `<style nonce>` ===
response CSP nonce), `/login` renders the inert card, and `connect-src` carries no Supabase origin
while unconfigured. The middleware tests include the c38cb71 request===response-nonce regression
guard plus a guard that the session refresh is inert when unconfigured.

---

## ▶ Arming checklist (human-only)

Do these in order. Nothing here is reversible-by-agent, which is why it's yours.

1. **Pull secrets via Doppler** (already created the `hey-lar` project). Set, for the portal:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the **publishable** key (Supabase → Project Settings →
     API keys). This is browser-safe **because** RLS is on.
   - (server-only, if/when server code needs elevated access) `SUPABASE_SECRET_KEY` — **never**
     `NEXT_PUBLIC_*`, never in the client bundle.
2. **Apply the migration.** Supabase → SQL Editor → paste `supabase/migrations/0001_lar_sync.sql`
   and run (or `supabase db push`). Confirm RLS is **enabled** on `lar_documents` (Table editor shows
   the shield) and the four policies + two RPCs exist.
3. **Configure Auth** (Supabase → Authentication):
   - **Providers → Email**: enable. Decide whether to allow new signups.
   - **URL Configuration**: set **Site URL** to the deployed origin; add `…/auth/confirm` to **Redirect URLs**
     (and `http://localhost:3000/auth/confirm` for local).
   - **Email Templates → Magic Link**: point the link at the confirm route so the token is verified
     **server-side**:
     ```
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in to Lar</a>
     ```
     (The confirm route reads `type` from the query and passes it to `verifyOtp`, so whatever the
     template sends is honored.)
4. **Rebuild & deploy.** `NEXT_PUBLIC_*` vars are inlined at build — a rebuild is required for
   `isSupabaseConfigured()` to flip true and `/login` to show the form.
5. **First-armed-run smoke** (do once, live):
   - Visit `/login` → it shows the form (not the inert card).
   - Enter your email → "check your email" → open the link → it lands on `/` signed in.
   - `GET /api/whoami` returns `{ ok: true, user: { id, email } }` (was 401).
   - **RLS isolation:** sign in as a second user; confirm neither can pull the other's rows.
   - **Cookie propagation:** the simplified `refreshSession` writes cookies on the response but does
     not recreate it (to preserve the CSP response). Confirm a freshly-refreshed token is visible to
     server components in the _same_ request; if not, adopt the canonical recreate-response pattern
     (re-applying the `x-nonce`/CSP request headers) — note for review.
   - **Theme intact:** confirm the home page still themes (the `connect-src` now includes the Supabase
     origin; everything else unchanged).

Until step 4 happens, all of the above is dormant and the keyless app is untouched.

---

## ▶ Full multi-method build — status, roadmap & costs

Alberto chose the **full** auth build. The architecture is provider-agnostic: every OAuth
method + the default email all land on `/auth/confirm` (PKCE `?code` exchange), and the UI
shows a method **only when enabled** via `NEXT_PUBLIC_AUTH_METHODS` (default
`google,email,passkey`). So lighting up a new method is a config toggle, not a rewrite.

| Method              | Code                | Cost                               | Founder setup to go live                                               |
| ------------------- | ------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| ✉️ Email magic link | ✅ built            | Free (Resend SMTP — see `docs/21`) | Enable Email provider; arm SMTP                                        |
| 🟢 Google           | ✅ built            | Free                               | Google Cloud OAuth client → paste ID/secret into Supabase              |
| 🍎 Apple            | ✅ built (UI gated) | **$99/yr**                         | Apple Developer → Services ID (= Client ID) + .p8 key + 6-mo secret    |
| 📱 Phone/SMS        | ✅ built (UI gated) | **Paid SMS** (Twilio…) + CAPTCHA   | SMS provider creds in Supabase; enable Phone                           |
| 🔑 Passkeys         | ✅ built            | Free (experimental)                | Dashboard → Passkeys: enable + set RP ID (apex `heylar.ai`) once       |
| 🔐 MFA (TOTP)       | ✅ built            | Free                               | None — on by default; apply `0003_mfa_aal.sql` to enforce              |
| 🪝 Allow-list       | ✅ built            | Free                               | Apply `0002_alpha_allowlist.sql` + enable the Before-User-Created hook |

**Recommended order:** email → Google → Apple → passkeys → MFA → phone. Email + Google are
free and validate the whole session/RLS plumbing; Apple/phone are gated on paid accounts.

### New files this build

`lib/supabase/{mfa,passkeys,auth-methods}.ts` · `components/PhoneSignIn.tsx` ·
`components/account/{TwoFactorCard,PasskeysCard,AccountMethods}.tsx` · `app/account/page.tsx`
(the security surface) · migrations `0002_alpha_allowlist.sql`, `0003_mfa_aal.sql`.

### Identity linking (important)

Supabase **auto-links the same VERIFIED email** across Google/Apple/email to ONE user — keep
this ON (it's verified-gated, so safe). **Manual linking stays OFF** until we ship a guarded
"connect account" flow. All app data keys off the immutable `user.id` (`claims.sub`), never
email. Keep "Confirm email" ON so no unverified-email identity can be exploited.

### 🔒 Security checklist (verify on first arming)

1. **PKCE is same-device** — open the magic link / OAuth in the SAME browser that started it, or `exchangeCodeForSession` fails. Surface that in UX copy.
2. **Redirect allow-list** — every `redirectTo` must be in Supabase → URL Configuration → Redirect URLs, or Supabase silently falls back to Site URL.
3. **OAuth redirect URI = the SUPABASE callback** (`https://<ref>.supabase.co/auth/v1/callback`), NOT the app URL. Apple Client ID = the **Services ID**, not the App ID.
4. **`getClaims()` server-side, never `getSession()`** — already correct in `auth.ts`/`middleware.ts`. Audit every new server route.
5. **Secret key never client-side** — only the publishable key reaches the browser (RLS makes it safe). Apple `.p8` + client-secret JWT are credentials (git-ignored, password manager).
6. **Open-redirect guard** — `/auth/confirm` only honors a same-origin `next` (already enforced). Mirror anywhere a redirect is threaded.
7. **RLS is the real wall** — client MFA/AAL gating is UX only; AAL2 is enforced in Postgres (`0003`). Verify cross-user isolation with two accounts.
8. **Allow-list hook** is the only un-bypassable signup gate; needs the `supabase_auth_admin` grant + SELECT policy or it reads zero rows. Phone signups have null email (blocked by design).
9. **Abuse controls before phone goes public** — CAPTCHA + tight resend/hourly caps (SMS toll-fraud is a real cost attack).
10. **Apple secret expires every 6 months** — silent total outage when it lapses. Calendar reminder + keep the `.p8`.

### Top risks (from the research synthesis)

Apple's 6-month secret expiry (silent outage) · SMS toll-fraud on an unprotected phone form ·
built-in email unfit for launch (→ Resend, `docs/21`) · cross-provider identity collisions
(key off `sub`). Full per-method founder steps, code patterns, and citations live in the
research blueprint captured in the build commits.
