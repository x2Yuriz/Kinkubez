# เที่ยวไทย — Cinematic Thailand Travel Landing

A Vite + React + TypeScript travel homepage with a scroll-driven cinematic opening.
The existing page sections (destination cards, white package cards and the dark green
footer) are preserved around the new intro.

## Run

```bash
npm install
npm run dev
npm run build
npm run preview
```

## The intro

- **Video-in-type mask** — [`src/components/CinematicIntro.tsx`](src/components/CinematicIntro.tsx)
  renders an inline SVG whose `<clipPath>` contains the Thai title. A real Thailand
  aerial clip lives inside a `<foreignObject>` and is clipped to the glyphs, so the
  video only shows inside `การท่องเที่ยวไทย`.
- **Autoplay + scroll handoff** — on load the intro plays like a short film on a
  clock: the title enters small and dim, zooms exponentially through the letters
  while the footage keeps playing inside them, fades to black, and glides into the
  homepage. The clock scrubs the same scroll timeline, so the first wheel, touch or
  scrollbar move (or the skip button) stops it and hands control to the user.
  Scrolling is never locked and no audio is played.
- **Skip** — “ข้ามแอนิเมชัน” scrolls straight to the homepage and moves focus there.
- **Reduced motion** — `prefers-reduced-motion` swaps the video for its poster, drops
  the scroll choreography and the autoplay, and shows the static intro. Save-Data is
  respected too.
- The video pauses when it leaves the viewport or the tab is hidden.

The video is 1280×720 H.264 with no audio track (~2.9 MB), and the photos are WebP.
Thai display type is self-hosted Kanit, with Noto Sans Thai for body copy.

## Verify

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173  # serve the production build
npm i --no-save playwright-core                   # capture helper (uses installed Edge)
node scripts/check-zoom.mjs                       # writes scroll-progress frames to .screens/zoom
```

The script checks the autoplay timeline (including landing on the homepage), the
interrupt and skip behaviour, the scroll scrub, reduced motion, mobile layout,
horizontal overflow and console errors in one run.

## Assets

- Footage: [“Beach, Nature, Sea”](https://pixabay.com/videos/beach-nature-sea-sand-ocean-water-338904/), Pixabay.
- Photography: Pixabay.
- Fonts: Kanit and Noto Sans Thai (SIL Open Font License).

## Backend (Supabase)

The app works without a backend: it shows labelled sample trips and cannot take bookings. To turn on accounts, bookings, reviews and the admin dashboard:

1. **Create a project** at supabase.com.
2. **Run the migrations**, in order, in the SQL editor (or `supabase db push`):
   `supabase/migrations/20261025000100_core.sql`, then `20261025000200_storage.sql`, then `20261025000300_verification.sql`, then `20261025000400_trip_province.sql` (77 provinces + Google Maps meeting-point links; coordinates are parsed in the database from links that contain them, short `maps.app.goo.gl` links are saved without a map pin).
   All are safe to rerun. `supabase/seed.sql` contains **sample data only** (every row has `is_sample = true`). Use it locally; do not load it in production.
3. **Set up Google OAuth**
   - In Google Cloud Console, create an OAuth client of type *Web application*.
   - Set the authorised redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`.
   - In Supabase → Authentication → Providers → Google, paste the client ID and secret. The secret stays in Supabase, never in this repo.
4. **Set the auth URLs.** In Supabase → Authentication → URL Configuration:
   - Site URL: your production origin.
   - Redirect URLs: `http://localhost:5173/auth/callback`, `http://localhost:5173/auth/reset`, `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/reset`.
   - Email + password: in Authentication → Providers → Email, keep the provider on, turn on **Confirm email**, and set the minimum password length to 8 (the form checks 8 too).
   - The built-in Supabase mailer is heavily rate-limited and meant for testing. For production, set custom SMTP under Authentication → Emails → SMTP Settings.
   - Confirmation and reset links use PKCE, so they must be opened in the same browser that asked for them. Otherwise `/auth/callback` or `/auth/reset` shows a Thai error with a retry button.
5. **Add env vars.** Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only the anon key goes here; it is public by design and protected by RLS. Never put the service-role key in any `VITE_*` variable.
6. **Create the first admin.** Sign in once, then run this in the SQL editor as the project owner:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-auth-user-uuid>';
   ```
   Users cannot change their own role: the `role` column is not granted for client updates, and only an admin can call `admin_set_role`.

All privileged actions (role changes, booking status, moderation and audit logging) are Postgres `security definer` RPCs that check the caller's role. No Edge Function and no service-role key is needed.

Roles:

| Role | Can do |
|---|---|
| `traveler` | Book trips, favourite trips, review completed trips |
| `buddy` / `guide` | Everything a traveler can, plus create trips (approval needed to publish) |
| `admin` | Manage users, roles, trips, bookings, reviews, reports and packages; view audit logs |

### Google Maps (trip map)

The map on `/trips` uses the Google Maps JavaScript API. Without a key, the map area shows a Thai setup message and the trip list keeps working.

1. In Google Cloud Console, pick or create a project and open **APIs & Services → Library**. Enable **Maps JavaScript API**.
2. **Billing:** Google requires a billing account on the project before Maps loads, even within the free monthly usage. Attach one under **Billing**. Optionally, set a budget alert.
3. **Create the key** in **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key.** This key ships to the browser, so the restriction is what protects it.
   - Under *Application restrictions*, choose **Websites** and add `https://<your-domain>/*`, plus `https://*.vercel.app/*` if you use preview deploys. For local dev, add `http://localhost:5173/*` and `http://127.0.0.1:5173/*`.
   - Under *API restrictions*, choose **Restrict key** and select only **Maps JavaScript API**.
5. **Add the key.** Put `VITE_GOOGLE_MAPS_API_KEY=<key>` in `.env.local` and in Vercel → Project → Settings → Environment Variables. Then restart `npm run dev` or redeploy, because Vite reads env vars at build time. Never commit the key.

If the key is wrong, the API is off, billing is missing or the domain isn't allowed, the map shows "Google Maps ไม่อนุญาตให้ใช้คีย์นี้" instead of a blank box.

### Identity verification

Account page → **ยืนยันตัวตน**. Travelers request an identity check; Buddy and guide applications use the same form (the old one-click `request_provider_role` RPC is retired).

- Status per profile: `unverified` → `pending` → `approved` / `rejected`. "ยืนยันตัวตนแล้ว" appears only after an admin approves. Users cannot write `identity_status`, and they cannot insert requests directly. Requests go only through `submit_verification`.
- Data collected: the legal name, the document type, 1–3 files and an optional note. The form asks users to cover fields that aren't needed, and they must tick a consent box.
- Files go in the **private** bucket `verification-docs` (5 MB; JPG, PNG, WebP or PDF), under `<user-id>/…`. Owners can upload only to their own folder. Admins can read a file only while its request is pending, through a 60-second signed URL. Nobody can delete a file while its request is pending, and there is no update policy.
- Admin dashboard → **ยืนยันตัวตน** tab: open documents, then approve, or reject with a reason that is required and shown to the user. Approval of a Buddy or guide request also grants that role. Admins cannot review their own request. Every submit and decision goes to `audit_logs` with the kind, user and reason only, never names, file paths or tokens. The user gets a notification.
- After a decision or withdrawal, the request stops pointing at its files, and the browser deletes them. If that deletion fails, the admin sees a warning and must delete the files by hand in Storage.

Payments are not implemented. Bookings are requests that the organiser confirms.

### Backend tests

```bash
npm run test:db   # runs migrations + RLS/RPC tests in PGlite (no Docker)
```
