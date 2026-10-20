# Box Finder / Kutu Bul

Photograph what goes into each storage box, let AI list the contents, print a QR label, and later find anything by searching or scanning the label. Works for your own things, for a family, and for a storage business with customers.

## What it does

**Boxes and finding things**
- **Boxes** with an automatic code (`B-0001`, `B-0002`, …), a name, a place, a spot ("top shelf, left") and notes
- **Scan contents:** take up to 4 photos, AI lists the items with quantity and category, and you check the list before saving
- **Add by typing:** `hammer, 3 extension cords, tape measure x2` becomes three items
- **Search** across every box. It ignores Turkish letters and case (`cekic` finds *Çekiç*), tolerates small typos, and sums up "3 matches in 2 boxes, 5 pieces in total"
- **Places / units** with a colour, and filters on the home screen
- **QR labels** on A4 (8 or 24 per page), coloured by place or destination room. Scanning a label opens that box

**Everyday**
- **Taken out / lent:** mark an item as out ("With Ali"); search and the home screen show where it really is, with "Put back"
- **Works without signal:** the current space is saved on the phone; search and box pages open offline, and item changes are sent when you're back online
- **Expiry dates** and **box reminders** (optionally every year), listed on the home screen when due
- **Share a box:** a read-only link showing the box and its items (no values, serials or notes), which you can turn off

**Moving house**
- **Moving mode:** rooms with colours, a status per box (packed, on the way, unpacked), a fragile flag, progress, and "not arrived yet"
- **Select several boxes** to move, set status or room, or print labels at once

**Records**
- **Value per piece and a receipt photo**, with the total per box
- **Appliances:** brand, model, serial number, purchase date and warranty. **AI reads the rating plate** from a photo. Warranties ending soon show up on the home screen
- **Export** to an Excel file (items and boxes sheets) or a PDF report

**Shared spaces and business**
- **Several spaces** per person (personal / family, or business), with a switcher
- **Invite links** with roles: editor (changes things), viewer (looks only), customer (business spaces only: sees just their own units)
- **Customer view:** customers see only their units' boxes and can **request a box**; staff mark requests ready and handed over
- **Activity log:** who added, moved or took out what, and when
- **Branding:** company name, colour and logo on the app and labels; currency for values

**Before launch**
- Google sign-in, in-app feedback, privacy policy page (`privacy.html`, English and Turkish)
- English / Turkish, light / dark, installable on the home screen
- **Daily AI limit** per user (default 20 scans a day), enforced on the server

Not built yet: payments and a paid plan (needs a merchant account and pricing decisions), push notifications for reminders, native App Store / Play Store apps.

## Files

| File | What it is |
|---|---|
| `index.html` | The page, styles and layout |
| `js/app.js` | The core app: sign-in, boxes, items, places, labels, scanner |
| `js/offline.js`, `js/records.js`, `js/moving.js`, `js/spaces.js`, `js/extras.js` | Features, each in its own file |
| `js/i18n.js` | English and Turkish text |
| `config.js` | Your Supabase URL + publishable key |
| `s.html` | The public page behind a box share link |
| `privacy.html` | Privacy policy (EN/TR) |
| `supabase/schema.sql` | Database setup; run it in the SQL Editor (safe to run again) |
| `supabase/functions/box-ai/index.ts` | The AI edge function (Gemini) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable app + offline |
| `fonts/`, `vendor/` | Self-hosted fonts and the QR libraries |
| `tests/` | Automated tests (not deployed) |

No build step: Vercel serves the files as they are.

## Updating an existing project to version 2

Do these **in this order**. Your current link keeps working after step 1, because the new database is compatible with the old app.

1. **Database:** Supabase → **SQL Editor → New query** → paste the whole new `supabase/schema.sql` → **Run** (confirm the warning). It adds the new tables and columns and keeps all your data.
2. **AI function:** Edge Functions → **box-ai** → **Code** → replace everything with the new `supabase/functions/box-ai/index.ts` → **Deploy**. Keep "Verify JWT" off.
3. **Check the preview** of the `v2-features` branch (Vercel posts the link on the pull request), then merge the pull request.

## Setup from scratch (about 15 minutes)

### 1. Create a Supabase project
Supabase → **New project** → name it e.g. `box-finder`, region **Central EU (Frankfurt)**, save the database password somewhere safe.

### 2. Create the database
**SQL Editor → New query** → paste the whole of `supabase/schema.sql` → **Run**. It creates the tables, security rules, search, the private photo bucket `box-photos`, and the account-delete function. Running it again is safe.

### 3. Sign-in settings
- **Authentication → Sign In / Providers:** keep **Email** on. For testing with friends you can turn **Confirm email** off.
- **Authentication → URL Configuration:** set **Site URL** to your Vercel address and add it to **Redirect URLs** as `https://your-address.vercel.app/**`, plus your preview address. Password reset, Google sign-in and invite links use these.

### 4. Google sign-in (optional)
1. In Google Cloud → **Google Auth Platform → Clients**, open your web client (you can reuse the one from Fridge-to-Table) and add this **Authorized redirect URI**: `https://<your-project>.supabase.co/auth/v1/callback` (Supabase shows the exact address on the Google provider page).
2. Supabase → **Authentication → Sign In / Providers → Google** → turn on, paste the **Client ID** and **Client secret** → Save.
3. While the Google app is in *Testing*, only test users you added can sign in with Google. Publish it before sharing widely.

### 5. Deploy the AI function
**Edge Functions → Deploy a new function → Via editor** → name it exactly **`box-ai`** → paste all of `supabase/functions/box-ai/index.ts` → **Deploy**. Then open the function → **Details** → turn **Verify JWT** **off** → Save. The function checks the login itself, and the built-in check rejects the new-style keys that new projects use.

**Edge Functions → Secrets → Add new secret:**

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | A Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | *(optional)* default `gemini-3.5-flash-lite` (cheap and good with photos); `gemini-3.8-flash` for higher accuracy |
| `AI_DAILY_LIMIT` | *(optional)* scans per user per day, default `20` (label reading counts as one scan) |

The key never reaches the browser. The function builds the prompts itself, so nobody can use your key for anything other than "what's in these photos" and "read this label".

### 6. Connect the app
Open `config.js` and paste your **Project URL** and **publishable key** (Supabase → **Connect**). Both are safe to be public. **Never** paste the secret / service_role key or the Gemini key there.

### 7. Put it online with Vercel
Vercel → **Add New → Project** → import `hamzayz0307/Storage` → Framework preset **Other**, no build command → **Deploy**. Each branch gets its own preview link.

Note: Vercel's free Hobby plan is for non-commercial use. Switch to Pro when the app starts earning money.

## How the data is protected
- Every table has row level security. Owners and editors can change a space; viewers can only look; customers only see boxes in the units they were given.
- Members, roles and invites can only be changed through checked database functions (only the owner invites, changes roles or removes people; nobody can take over a space).
- Photos, receipts and logos are in a **private** bucket and shown through short-lived signed links, with the same rules as the boxes.
- Items, photos, share links and requests always take their space from their box, so nothing can be slipped into someone else's space.
- The activity log is written only by the database itself; the daily AI counter only by the edge function.
- Share links show only box name, place and item names; never values, serial numbers or notes.

## Running the tests
```bash
cd tests
npm install
npx playwright install chromium
node schema.test.mjs        # database basics (real Postgres via PGlite)
node features.test.mjs      # roles, customers, invites, requests, activity, shares, upgrade from v1
node smoke.mjs              # the core app in headless Chrome with a fake Supabase + fake AI
node features.smoke.mjs     # every v2 feature end to end, including offline and a customer
node i18n.check.mjs         # every text exists in English and Turkish
deno run --allow-env --allow-read --allow-net box-ai.test.ts ../supabase/functions/box-ai/index.ts
```
