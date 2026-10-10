# Box Finder / Kutu Bul

Storage-box inventory web app: photograph a box's contents, AI lists the items, print QR labels, find anything by search or by scanning a label. Owner: Hamza (sibling project of `hamzayz0307/fridge-to-table`, same stack and conventions). Prototype is **single-user**; the data model is built for **shared spaces** later (business with staff, families).

## Architecture
- **Frontend:** one `index.html` (HTML + CSS + JS, no build step), hosted on **Vercel**, auto-deployed from this repo. Supabase URL + publishable key live in `config.js` (public by design; RLS protects data).
- **Backend:** its **own Supabase project** (separate from Fridge-to-Table): Postgres + Auth + Storage + Edge Functions.
- **AI:** Google **Gemini** via the Edge Function `box-ai` (`supabase/functions/box-ai/index.ts`). The prompt is built server-side; the browser only sends photos + language + an optional hint. Secrets: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `AI_DAILY_LIMIT` (default 20). Uses `responseSchema` JSON output, `thinkingLevel: low` (retries without it on models that reject it), retries on 429/5xx, refunds the credit when the AI call fails.
- **Libraries:** supabase-js from unpkg; `vendor/qrcode.js` (QR generation) and `vendor/jsQR.js` (scanner fallback when `BarcodeDetector` is missing, lazy-loaded) are self-hosted. Fonts are self-hosted in `fonts/` (no Google Fonts requests).

## Security rules (do not break)
- Never put secret keys (service_role/secret key, Gemini key, passwords) in this repo. Secrets go in Supabase Secrets.
- Every table has RLS. Access is by **space membership**: `is_space_member(space_id)` to read, `can_edit_space(space_id)` (owner/editor) to write. Both are security-definer helpers.
- `items.space_id` and `box_photos.space_id` are always copied from the box by a trigger; the app never sends them.
- `consume_ai_credit` / `refund_ai_credit` are executable by `service_role` only.
- Work on a separate branch and let the owner review the Vercel preview; never push to `main` directly.
- Database changes: write SQL and give it to the owner to run in the Supabase SQL Editor (no direct DB access). Keep `supabase/schema.sql` re-runnable (`if not exists` / `or replace` / `drop policy if exists`).

## Data model (`supabase/schema.sql`)
`spaces` (name, owner_id, box_counter) · `space_members` (space_id, user_id, role owner/editor/viewer) · `profiles` (user_id PK, display_name, language en/tr, current_space_id, onboarded) · `locations` (space_id, name, notes) · `boxes` (space_id, location_id, code `B-0001` auto per space, name, spot, notes, cover_photo_id, label_printed_at, generated `search_text`) · `box_photos` (space_id, box_id, path) · `items` (space_id, box_id, name, category, quantity, notes, source manual/ai, generated `search_text`) · `ai_usage` (user_id, day, count).
- Functions: `bootstrap_me(p_language, p_space_name)` creates profile + personal space on first sign-in (spaces can only be created here) · `list_boxes(p_space)` boxes with item_count, photo_count, cover_path · `search_inventory(p_space, p_query)` items + boxes via `fold_text()` (lowercase, Turkish letters folded) + pg_trgm (`word_similarity_threshold` 0.45) · `delete_my_account()`.
- Storage: private bucket `box-photos`, path `<space_id>/<box_id>/<uuid>.jpg`, policies use the first folder as space id. Supabase blocks deleting files from SQL, so the app removes files through the Storage API **before** deleting a box / the account.
- Categories (keys stored in English, labels translated): tools, electronics, kitchen, clothing, bedding, books, documents, toys, sports, seasonal, decor, cleaning, personal, hobby, other. Same list in `index.html` (`CATEGORIES`) and the edge function.

## App structure (`index.html`)
- Hash router: `#/` boxes (home), `#/box/<id>`, `#/places`, `#/labels`, `#/me`. QR labels encode `<origin>/?box=<uuid>`; after sign-in that becomes `#/box/<uuid>`.
- Global click delegation: elements with `data-act="..."` call functions in `ACTIONS`. Bottom panels via `openSheet()` / `closeSheet()` / `confirmSheet()`.
- Photos are resized in the browser to max 1280px JPEG (`prepareImage`) before upload and before AI.
- Bottom bar: Boxes · Places · **Scan** (center, opens the camera scanner) · Labels · Me.
- Bilingual: all UI strings in `I18N.en` / `I18N.tr`, `t(key, vars)`, plurals via `tp(base, n)` with `_one` / `_other` keys. AI is told to write item names in the selected language.
- Theme: Light / Dark / System in localStorage `bf_theme`, set before first paint by the inline script in `<head>`. Use the CSS tokens (`--surface`, `--ink`, `--on-ink`, `--kraft`, …) instead of hard-coded colors.
- Test hook: if `window.__TEST_SUPABASE__` exists it is used instead of the real client (see `tests/fake-supabase.js`).

## Visual style
- Concrete-grey page (`--bg`) with white surfaces; the **kraft-paper label** (`.kraft`, `--kraft`, faint fibre texture, one strip of tape on the big label) is the identity of a box everywhere: tiles, search results, the box page hero, the labels list.
- Box codes always use the stencil face (`--font-code`: Big Shoulders Stencil). Titles: Big Shoulders. UI text: Instrument Sans (same as Fridge-to-Table).
- Near-black primary buttons (inverted in dark mode), no all-caps labels, no middle-dot separators.

## Working conventions
- Keep element `id`s and `data-act` names stable; tests depend on them.
- After changes run the tests in `tests/` (see README): `schema.test.mjs` (PGlite, real Postgres), `smoke.mjs` (headless Chromium + fake Supabase + fake AI, all main flows in EN/TR, light/dark), `box-ai.test.ts` (Deno). Every `t()` key must exist in both languages.
- Bump `CACHE` in `sw.js` when the shell file list changes.

## Open items for the owner
- Not done yet: shared spaces UI (invites, roles), Google sign-in, in-app feedback, privacy policy page (photos go to Google Gemini, so one is needed before a public launch), custom domain.
- Vercel Hobby is non-commercial; switch to Pro when the app earns money.
