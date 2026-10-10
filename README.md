# Box Finder / Kutu Bul

Photograph what goes into each storage box, let AI list the contents, print a QR label, and later find anything by searching or scanning the label.

> **Prototype (v1): single user.** The database is already built around *spaces*, so shared storage for families or a storage business can be added later without rebuilding anything.

## What it does

- **Boxes** with an automatic code (`B-0001`, `B-0002`, …), a name, a place, a spot ("top shelf, left") and notes
- **Scan contents:** take up to 4 photos, AI lists the items with quantity and category, and you check the list before saving
- **Add by typing:** `hammer, 3 extension cords, tape measure x2` becomes three items
- **Search** across every box. It ignores Turkish letters and case (`cekic` finds *Çekiç*) and tolerates small typos
- **Places** (Garage, Attic, Storage unit 14B…) with filters on the home screen
- **QR labels:** print sheets on A4 (large 8 per page or small 24 per page). Scanning a label opens that box
- **Scanner** inside the app (or use the phone's normal camera, which opens the box link)
- English / Turkish, light / dark, installable on the home screen, works offline for opening
- **Daily AI limit** per user (default 20 scans a day), enforced on the server

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (HTML + CSS + JS, no build step) |
| `config.js` | Your Supabase URL + publishable key, **edit this** |
| `supabase/schema.sql` | Database setup, run once in the SQL Editor |
| `supabase/functions/box-ai/index.ts` | The AI edge function (Gemini) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable app + offline |
| `fonts/`, `vendor/` | Self-hosted fonts and the QR libraries |
| `tests/` | Automated tests (not deployed) |

## Setup (about 15 minutes)

### 1. Create a new Supabase project
Use a **separate project** from Fridge-to-Table so the two apps stay independent (the free plan allows 2 projects).

Supabase → **New project** → name it e.g. `box-finder`, region **Central EU (Frankfurt)**, save the database password somewhere safe.

### 2. Create the database
**SQL Editor → New query** → paste the whole of `supabase/schema.sql` → **Run**.
It creates the tables, security rules, search, the private photo bucket `box-photos`, and the account-delete function. Running it again is safe.

### 3. Sign-in settings
- **Authentication → Sign In / Providers → Email:** keep it on. For testing with friends you can turn **Confirm email** off, like in Fridge-to-Table.
- **Authentication → URL Configuration:** set **Site URL** to your Vercel address (step 6) and add it to **Redirect URLs** too, plus your preview URL. Password-reset emails use these.

### 4. Deploy the AI function
**Edge Functions → Deploy a new function → Via editor** → name it exactly **`box-ai`** → replace the example code with all of `supabase/functions/box-ai/index.ts` → **Deploy**. Leave "Verify JWT" on.

Then **Edge Functions → Secrets → Add new secret:**

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | A Gemini API key from Google AI Studio. Making a new key for this app lets you see its spending separately. |
| `GEMINI_MODEL` | *(optional)* default is `gemini-3.5-flash-lite` (cheap and good with photos). Use `gemini-3.8-flash` if you want higher accuracy. |
| `AI_DAILY_LIMIT` | *(optional)* scans per user per day, default `20` |

The key never reaches the browser. The function builds the prompt itself, so nobody can use your key for anything other than "what's in these photos".

### 5. Connect the app
Open `config.js` and paste your **Project URL** and **publishable key** (Supabase → **Connect** button, or Project Settings → API Keys). Both are safe to be public. **Never** paste the secret / service_role key or the Gemini key there.

### 6. Put it online with Vercel
Vercel → **Add New → Project** → import `hamzayz0307/Storage` → Framework preset **Other**, no build command → **Deploy**.
Each branch gets its own preview link, so you can check changes before merging them into `main`.

Note: Vercel's free Hobby plan is for non-commercial use. Switch to Pro when the app starts earning money.

### 7. Try it
Open the link on your phone → create an account → **New box** → **Scan contents** → **Labels → Print**. Stick a label on the box and scan it with the **Scan** button.

## How the data is protected
- Every table has row level security: you only ever see boxes in spaces you're a member of.
- Photos are in a **private** bucket and shown through short-lived signed links.
- Items and photos always take their space from their box, so nothing can be slipped into someone else's box.
- The daily AI counter can only be changed by the edge function (service role), not by the app.

## Running the tests
```bash
cd tests
npm install
npx playwright install chromium
node schema.test.mjs   # database: RLS isolation, codes, search, AI limit, account delete (real Postgres via PGlite)
node smoke.mjs         # the whole app in headless Chrome with a fake Supabase + fake AI
deno run --allow-env --allow-read --allow-net box-ai.test.ts ../supabase/functions/box-ai/index.ts   # AI function
```

## Later (not in v1)
- **Shared spaces:** invite family members or staff (owner / editor / viewer roles already exist in the database)
- Google sign-in, in-app feedback, privacy policy page, custom domain
- Moving mode (packed → in transit → unpacked), natural-language search, export to Excel/PDF
- Storage-business version for storage customers
- App Store / Play Store
