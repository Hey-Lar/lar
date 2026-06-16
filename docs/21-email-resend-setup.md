# 📧 Resend email setup for Lar — the _really_ easy version

> What this does: makes Lar send **branded, reliable sign-in emails from `@heylar.ai`** (instead
> of Supabase's rate-limited built-in email). ⏱️ ~15–20 min. 🔒 You never paste any secret to me.

There are **3 parts**: 🅰️ Resend → 🅱️ Supabase → 🅲 Brand the emails. Do them in order. ✨

---

## 🅰️ PART A — Set up Resend properly

### A1 · 🌐 Add your domain

1. Go to 👉 **https://resend.com/domains**
2. Click **➕ Add Domain**
3. Type:
   ```
   heylar.ai
   ```
4. Region: pick the one closest to you (e.g. **EU (Ireland)** to match your Supabase). 🇪🇺
5. Click **Add**

### A2 · 📋 Copy the DNS records Resend shows you

Resend now shows a table of **3 records** (an **SPF**, a **DKIM**, and an **MX**). Keep this tab open — you'll copy each one. 👀

### A3 · 🛠️ Paste those records into your DNS

1. Go to wherever **heylar.ai's DNS** lives (most likely **Vercel → your project → Settings → Domains**, or Cloudflare, or your registrar).
2. For **each** record Resend showed, click **Add Record** and copy the **Type / Name / Value** across **exactly**. 📎
3. 💡 Tip: copy-paste each value — one wrong character and it won't verify.

### A4 · 🛡️ Add a DMARC record (the "best-practice" extra)

This protects your domain from spoofing. Add **one more** DNS record:

- **Type:** `TXT`
- **Name:** `_dmarc`
- **Value:**
  ```
  v=DMARC1; p=none; rua=mailto:dmarc@heylar.ai
  ```

### A5 · ✅ Verify

1. Back in Resend → click **Verify**.
2. ⏳ Wait a few minutes (sometimes up to an hour) → records turn **green** ✅.

> ⚡ **Want to test TONIGHT without waiting for DNS?** In Part B, use sender `onboarding@resend.dev`. It works instantly — but only emails **your own Resend signup address** (great for testing as yourself).

### A6 · 🔑 Create an API key (this becomes your SMTP password)

1. Go to 👉 **https://resend.com/api-keys**
2. Click **➕ Create API Key**
3. **Name:** `Supabase Auth SMTP`
4. **Permission:** choose **Sending access** ✅ (NOT "Full access" — least privilege 🔒)
5. **Domain:** `heylar.ai` (restrict it to this domain)
6. Click **Add** → 📋 **copy the key** (starts `re_…`) somewhere safe — **you won't see it again.**

---

## 🅱️ PART B — Connect Resend to Supabase

### B1 · 🚪 Open the SMTP settings

Go to 👉 **Authentication → Emails → SMTP Settings**
(direct: `https://supabase.com/dashboard/project/kpassatuqizqhdiivwyx/settings/auth`)

### B2 · 🔌 Turn on custom SMTP

Toggle **Enable Custom SMTP** → **ON** 🟢

### B3 · ✍️ Fill in the form — copy each value

| Field                         | Paste this                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| **Sender email**              | `noreply@heylar.ai` _(or `onboarding@resend.dev` to test tonight)_ |
| **Sender name**               | `Lar`                                                              |
| **Host**                      | `smtp.resend.com`                                                  |
| **Port**                      | `465`                                                              |
| **Username**                  | `resend`                                                           |
| **Password**                  | your `re_…` key from **A6**                                        |
| **Minimum interval per user** | `60`                                                               |

### B4 · 💾 Save

Click **Save changes** ✅ — this **raises your email limit** AND **unlocks template editing** (needed for Part C).

---

## 🅲 PART C — Brand the emails (this is the old "3c", now unlocked)

> 🎉 Good news: you do **NOT** need any tricky link editing. The app already handles the
> default link — you're just making the email **look nice**.

### C1 · 🎨 Open the templates

Go to 👉 **Authentication → Email Templates**
(direct: `https://supabase.com/dashboard/project/kpassatuqizqhdiivwyx/auth/templates`)

### C2 · 📝 Brand the "Magic Link" template

1. Click **Magic Link**
2. Click inside the code box → **Ctrl + A** → **Delete**
3. Paste this whole block:
   ```html
   <h2 style="font-family:system-ui;color:#26303c">Sign in to Lar</h2>
   <p style="font-family:system-ui;color:#5a6573">
     Tap below to finish signing in. This link works once and expires in 60 minutes.
   </p>
   <p>
     <a
       href="{{ .ConfirmationURL }}"
       style="display:inline-block;padding:12px 22px;background:#d98a2b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-family:system-ui"
     >
       Sign in to Lar
     </a>
   </p>
   <p style="font-family:system-ui;color:#8b96a4;font-size:13px">
     If you didn't request this, you can safely ignore this email.
   </p>
   ```
4. Click **Save** 💾

### C3 · 📝 Do the same for "Confirm signup"

1. Click **Confirm signup**
2. **Ctrl + A** → **Delete** → paste the **same block** as C2
3. Click **Save** 💾

✅ **Done!** Branded, reliable Lar emails — and they work with the code that's already shipped.

---

## 🧪 Test it

1. Tell me **"ready"** and I'll start the app.
2. Open **http://localhost:4200/login**
3. Type your email → **Email me a sign-in link** → check inbox → click → **signed in.** 🎉

---

## 🚀 What else Resend can do (later — not needed for sign-in)

You asked what we could integrate. Once the domain's verified, Resend can also power:

- 👋 **Welcome / onboarding emails** when a tester joins
- 📨 **Product emails** (digests, "your space is ready", recovery notices) via the Resend SDK + React Email templates
- 📊 **Delivery & bounce tracking** via Resend webhooks → so we know if an email failed
- 📣 **Broadcasts** (announcements to your alpha list)

We'll wire these as the product grows — all from the same verified domain + a dedicated API key per use. 👍
