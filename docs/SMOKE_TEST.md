# Smoke test checklist

Walks through every flow that needs to work before grading. Run after a fresh
`./db/reset.sh` and a backend + frontend restart. Tick each box as you go;
each step lists the expected result so a missing tick is a real bug, not
ambiguity.

## Setup
- [ ] `./db/reset.sh` — wipes and reseeds; expect `Database reset complete.`
- [ ] `npm --prefix backend start` — `RecipeRoom backend running on port 3001`
- [ ] `npm --prefix frontend run dev` — Vite ready on `http://localhost:5173/`

## Auth (one of each role)
- [ ] Register **Home Cook** via the Sign In modal → toast `Welcome`, navbar shows username
- [ ] Register **Verified Chef** in a private window → user dropdown shows chef-only items
- [ ] Register **Local Supplier** in a private window → navbar switches to supplier nav (`Dashboard / Inventory / Orders`)
- [ ] Register **Administrator** in a private window → user dropdown shows `Admin Dashboard`
- [ ] Refresh any tab → still logged in (token in `localStorage.rr_token`)
- [ ] Click Sign Out → returns to logged-out state

## Browse + discover
- [ ] `/` shows hero + quick filters + feed tabs (For You / Trending / Recent / Following) + Challenges + Recommended For You
- [ ] Switching tabs lazy-loads recipes (network tab fires `/recipes` only on first open)
- [ ] Quick filter pill `Italian` → lands on `/recipes?cuisine=italian` with results
- [ ] `/recipes` search box and filter sidebar update the URL params
- [ ] Cuisine + difficulty + dietary filters narrow the grid
- [ ] Pagination updates `?page=` and scrolls to top

## Recipe detail (as Home Cook)
- [ ] Open any recipe → media carousel renders (or chef-hat fallback if no thumbnail)
- [ ] Heart toggles red and count increments — refresh persists
- [ ] Bookmark fills green and "Save" → "Saved" — refresh persists
- [ ] Follow on author row toggles `Follow` ↔ `Following`
- [ ] **I Cooked This** → toast `Logged to your cook log`
- [ ] **Fork This Recipe** → lands on `/create?fork=:id` with title pre-suffixed `(fork)` and form prefilled
- [ ] **Add to Cart** → opens substitution picker; pick items → cart badge in navbar increments
- [ ] Comments form: type a message → posts and shows immediately with your typed text
- [ ] Click heart on a comment → fills red and count increments

## Recipe ownership
- [ ] As recipe owner, the **Allowed Substitutions** card appears below ingredients
- [ ] Adding a substitute persists (refresh confirms)
- [ ] **Delete** button (red outlined) shows for owner; click → confirm modal → removes recipe and redirects to `/recipes`

## Create recipe
- [ ] `/create` form: title + description + image URL + cuisine + category + dietary tags + difficulty + times + servings
- [ ] Ingredient autocomplete fires after 200ms of typing — picking from dropdown stamps a real `ingredient_id`
- [ ] Allowed Substitutions card lets you whitelist swaps
- [ ] **Publish Recipe** → 201, lands on `/recipes/:newId`
- [ ] Forking from another recipe carries title/description/image/ingredients/substitutions

## Cart → Checkout → Order (royalty trigger)
- [ ] `/cart` shows the recipe with servings stepper + trash + Order Summary sidebar
- [ ] Adjusting servings updates the subtotal proportionally
- [ ] **Proceed to Checkout** → 3-step stepper
  - Review Cart shows substitution alert (if any) + per-supplier groups with item-level prices
  - Delivery: address required, notes optional, "2–3 business days" estimate
  - Payment: Wallet / Credit Card radios
- [ ] **Complete Order** → toast `Order placed`, redirects to `/profile`
- [ ] `/profile` Orders tab shows the new order with `Pending` status
- [ ] As the chef who owns the cooked recipe: their `/profile` Royalties tab shows the +1 royalty point (this exercises `trg_update_royalty_on_order`)

## Profile (Home Cook)
- [ ] Header: name, handle, location, bio, recipes/followers/following counts
- [ ] **Edit Profile** modal updates username/bio/location and refreshes the header
- [ ] My Recipes tab shows your published recipes
- [ ] Saved tab shows recipes you bookmarked (also reachable via the navbar bookmark icon)
- [ ] Meal Lists tab — create / list / delete
- [ ] Cook Log tab populates after **I Cooked This**
- [ ] Orders tab matches the order placed above
- [ ] Flavor Profile tab — add an ingredient with a 0–100 slider, save; row appears

## Profile (Verified Chef)
- [ ] Royalties tab shows Total Points / Orders Linked / Top Recipe + per-recipe performance rows
- [ ] Numbers match a direct query against `Earns_Royalty`

## Challenges
- [ ] `/challenges` lists active and (separately) completed challenges via tab toggle
- [ ] Active challenge → **Join Challenge** → state flips to Joined; counter increments
- [ ] After joining, **Log Recipe** modal lets you submit one of your published recipes
- [ ] Completed challenge → only **View Leaderboard** button shows (no Join)
- [ ] Leaderboard modal shows participants with rank, points, and (You) marker

## Supplier flow (in a supplier window)
- [ ] `/supplier` Dashboard: KPI cards (Open Orders / Low Stock / Total Products / Revenue This Month) + Recent Orders + Low Stock Alerts
- [ ] `/supplier/inventory` table: search, add new item via Ingredient autocomplete, inline edit stock + price → Save, delete with confirm
- [ ] When a Home Cook places an order against this supplier, it appears under `/supplier/orders` with `Pending` status
- [ ] Status dropdown moves Pending → Confirmed → Ready → Completed (Decline available at any step); filter-bar counts update live
- [ ] Expand an order row to see line items with quantities and subtotals

## Admin flow (in an admin window)
- [ ] `/admin` Overview: live KPI counts + Pending Verification Requests alert
- [ ] User Management: full table with role pill + Manage link
- [ ] Verifications: chef and supplier requests, Approve removes from list, Reject revokes their subtype row
- [ ] Recipe Management: full recipe table with engagement counts; "Move to…" dropdown adds the recipe to a Featured Selection
- [ ] Featured Selections: create new with title/dates/recipe picker → appears in the list and surfaces on Home `/`
- [ ] Analytics tab renders (placeholder for future endpoints — not crashing is the bar)

## Negative paths
- [ ] Adding the same ingredient as its own substitute → blocked by `trg_allows_substitution_check`
- [ ] Posting a recipe with empty title → 400 with field-level error
- [ ] Following yourself → 400 `You can't follow yourself`
- [ ] Reviewing your own recipe twice → 409 `You have already reviewed this recipe`
- [ ] Logging out then trying to access `/checkout` → redirects to login modal

If any box doesn't tick, file a single Slack message with: page name, what you
clicked, what happened, what you expected. Don't open a PR until everything
above passes against `main`.
