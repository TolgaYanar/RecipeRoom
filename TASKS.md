# RecipeRoom — Project Finalization Task List

This document enumerates **every task** required to finish RecipeRoom. When all tasks here are complete and checked off, the project is done.

- **Stack**: MySQL · Node.js/Express (raw SQL, no ORM) · React (Vite) + Tailwind CSS
- **Team**: 5 developers (Bilkent CS353, Group 7)
- **Scope**: exactly what the design report (DB Design Report) declares — no more, no less
- **Scope coverage**: backend API · frontend pages · shared components · DB features · seed data · demo prep

---

## How to read this document

Every task has:
- **ID** — short code (e.g. `B04`, `P03`) used in commits/PRs
- **Title**
- **Effort** — **S** ≤ half-day · **M** 1–2 days · **L** 3+ days
- **Do** — what to build
- **Accept** — objective acceptance criteria (task is not done until these pass)
- **Dep** — task IDs that must be done first

Task ID prefixes:
- `B##` — **B**ackend (API / Express / SQL)
- `F##` — **F**rontend shared infrastructure
- `P##` — **P**age (frontend)
- `D##` — **D**atabase / data
- `X##` — Cross-cutting (docs, testing, submission)

---

## Team swim lanes & owners

| Lane | Owner | Focus | Owns task IDs |
|---|---|---|---|
| **L1 — Backend Core & Auth** | Dev A | Auth, users, admin, DB utils, seed, security, validation | B01, B02, B03, B09, B11, B15, B17, D01, D02, D04 |
| **L2 — Backend Recipes & Content** | Dev B | Recipes, ingredients, substitutions, reviews, highlights, media, cook logs, affinity | B04, B05, B06, B10, B12, B18, B19, B20, B21, B22 |
| **L3 — Backend Commerce & Ops** | Dev C | Orders, suppliers, inventory, challenges, route mounting | B07, B08, B13, B14 |
| **Shared — Frontend↔Backend bridge** | Dev D | API client, auth context, route guards, UI kit, toast, 404, §3 query map, tag constants | F01, F02, F03, F04, F06, F07, D03, X08 |
| **L4 + L5 — All Frontend Pages** | **Dev E (lead)** | Every page + page-level components | P01–P13 + F05 + F08 |

---

## Status snapshot (as of today)

- Database schema, views, and royalty trigger — **done**
- `backend/src/routes/auth.js` (login + 4 register endpoints) — **done**
- Frontend shared kit (Navbar, AuthModal, route guards, API wrappers, toast wiring, NotFound) — **done**
- Frontend pages P01 Home, P02 Recipes, P03 RecipeDetail, P04 CreateRecipe, P06 Challenges, P07 Profile (with P13 Flavor Profile tab) — **done**, wired through Deniz's API wrappers
- F08 SubstitutionManager — **done**, mounted in CreateRecipe and RecipeDetail (owner view)
- All other pages (P05 Checkout, P08–P12 Supplier/Admin) — **placeholder files only**

---

# L1 — Backend Core & Auth

## B01 · Auth middleware + session [M]
- **Do**: Pick JWT (recommended) or express-session. Create `backend/src/middleware/auth.js` exporting `requireLogin` and `requireRole(...types)`. Populate `req.user = { id, user_type }` from token.
- **Accept**: Protected route returns 401 without token, 403 with wrong role, 200 with correct role (verify via curl).
- **Dep**: —

## B02 · DB helpers + error convention [S]
- **Do**: `backend/src/utils/db.js` — export `query(sql, params)` and `withTransaction(fn)`. Standardize error shape `{ error: string, code: string }`. Add a global error-handling middleware in `app.js`.
- **Accept**: No route file calls `pool.query` directly; errors return JSON, never stack traces.
- **Dep**: —

## B03 · Update auth.js to issue tokens [S]
- **Do**: Modify existing login and register endpoints in `routes/auth.js` to return `{ user, token }`. Keep existing role detection logic.
- **Accept**: Login response includes a JWT the frontend can store; `/api/auth/me` (new) returns current user from token.
- **Dep**: B01

## B09 · Users / profile API [M]
- **Do**: `routes/users.js`
  - `GET /api/users/:id` — public profile
  - `PATCH /api/users/:id` — self only
  - `GET /api/users/:id/recipes`
  - `GET /api/users/:id/royalties` — chefs only, returns rows from `Earns_Royalty` plus aggregate `royalty_points`
  - `GET /api/users/:id/meal-lists` — reads `Meal_List` + `Contains_Recipe`
  - `POST /api/users/:id/meal-lists` — create meal list
  - `PATCH /api/users/:id/meal-lists/:listId` — rename / update
  - `DELETE /api/users/:id/meal-lists/:listId`
  - `POST /api/users/:id/meal-lists/:listId/recipes` — add recipe (writes `Contains_Recipe`)
  - `DELETE /api/users/:id/meal-lists/:listId/recipes/:recipeId`
- **Accept**: Ownership enforced on PATCH/DELETE; royalties endpoint returns rows from `Earns_Royalty` table; meal lists appear on Profile tab.
- **Dep**: B01, B02

## B11 · Admin API [M]
- **Do**: `routes/admin.js`
  - `GET /api/admin/pending-chefs` — chefs with `verification_status = 'PENDING'`
  - `POST /api/admin/chefs/:id/approve`
  - `POST /api/admin/chefs/:id/reject`
  - `GET /api/admin/ingredients` — list
  - `POST /api/admin/ingredients` — create (covers new ingredient added by admin)
  - `PATCH /api/admin/ingredients/:id` — update
  - `DELETE /api/admin/ingredients/:id`
  - `POST /api/admin/content/:type/:id/moderate` — flag/remove recipe or review
- **Accept**: All routes require `Administrator` role; approval flips `verification_status` to `VERIFIED`; ingredient CRUD writes to `Ingredient` table.
- **Dep**: B01, B02

## B15 · Password hashing [S]
- **Do**: Install `bcrypt`. Update `backend/src/routes/auth.js`:
  - Register endpoints: hash password with `bcrypt.hash(password, 10)` before inserting
  - Login endpoint: replace plaintext `user.passwordHash !== password` check with `bcrypt.compare(password, user.passwordHash)`
  - Currently `auth.js:33` and `auth.js:59` use plaintext — this is a real security issue to fix before grading
- **Accept**: New registrations store a `$2b$...` hash in DB; existing plaintext rows need re-registering (or wipe DB and reseed); login works end-to-end.
- **Dep**: B03

## B17 · Request validation middleware [S]
- **Do**: Install `express-validator` (or `zod` + tiny wrapper). Define per-route schemas for required fields. Return 400 with readable field-level errors before touching SQL.
- **Accept**: Posting `{}` to any write endpoint returns 400 with `{ error: "validation", fields: {...} }`, not a raw SQL error.
- **Dep**: B02

## D01 · Seed script [M]
- **Do**: `db/seed.sql` — populate:
  - 2 verified chefs, 3 home cooks, 2 suppliers, 1 admin
  - ~10 recipes across cuisines (some forks, some originals), each with ingredients, steps, media, and tags
  - 1 active challenge, 1 past challenge with winner
  - 3 sample completed orders (so royalty trigger has fired)
  - Substitution rules covering common ingredients + per-recipe `Allows_Substitution` rows
  - Supplier inventory for each supplier
  - At least one `Featured_Selection` row (active) for Home highlights
  - Sample `Has_tag_pref` rows and `Logs_Cook` entries
- **Accept**: `mysql -u root -p reciperoom < db/seed.sql` leaves a demo-ready DB (no empty pages during demo).
- **Dep**: Schema (done)

## D02 · DB reset script [S]
- **Do**: `db/reset.sh` — runs `init.sql` then `seed.sql` in one command.
- **Accept**: `./db/reset.sh` returns DB to clean demo state.
- **Dep**: D01

## D03 · Design-report §3 query map + table-coverage audit [M]
- **Do**: Create `db/QUERY_MAP.md`:
  1. Enumerate every SQL query listed in design report §3 (Login, Register, Highlights, Affinity, Recipe Fork, Shop This Meal, Recipe Discovery, Create Recipe, Kitchen Challenges, Supplier Inventory, Orders, Cook Log, Royalty Statistics, Recipe Performance, etc.)
  2. For each, link to the API endpoint that implements it (e.g. "Recipe Fork → `POST /api/recipes/:id/fork` in `routes/recipes.js`")
  3. Enumerate all 25 tables — mark each with the endpoint(s) that read and write it
  4. Flag any table with no read path (must surface somewhere in the UI or justify why not)
- **Accept**: Every §3 query maps to an endpoint; every table has at least one reader; no orphaned tables. TA can tick this off during demo.
- **Dep**: B04, B06, B07, B08, B11, B12, B13, B18, B19, B20, B21, B22 (all backend routes that implement §3 queries)

## D04 · is_ingrd_different constraint (trigger workaround) [S]
- **Do**: Design report §4 declares `is_ingrd_different` on `Allows_Substitution` as the meaningful constraint. MySQL rejected the original CHECK constraint (error 3823 — CHECK referencing FK cols). Implement equivalent via a `BEFORE INSERT` and `BEFORE UPDATE` trigger on `Allows_Substitution` that raises `SIGNAL SQLSTATE '45000'` when `ingredient_id = substitute_ingredient_id`.
  - Add `db/triggers/trg_allows_substitution_check.sql`
  - Include the CREATE TRIGGER DDL in `init.sql` so fresh installs get it
- **Accept**: Inserting a row with `ingredient_id = substitute_ingredient_id` is rejected with a clear error; normal inserts succeed; design report §4 claim matches implementation.
- **Dep**: Schema (done)

---

# L2 — Backend Recipes & Content

## B04 · Recipes API [L]
- **Do**: `routes/recipes.js`
  - `GET /api/recipes` — filters: `?category=&cuisine=&diet=&ingredient=&dish_type=&meal=&popular=&q=&min_time=&max_time=&page=&limit=` (keys match Navbar dropdown values). Use `Recipe_Summary` view. **Range filter** on prep/cook time satisfies CS353 range-query grading criterion.
  - `GET /api/recipes/:id` — joins ingredients, steps, media, reviews, parent recipe
  - `POST /api/recipes` — transactional: insert `Recipe` + `Recipe_Ingredient[]` + `Recipe_Step[]` + tag rows + `Recipe_Media[]` + `Allows_Substitution[]`
  - `PUT /api/recipes/:id` — author only
  - `DELETE /api/recipes/:id` — author only
  - `POST /api/recipes/:id/fork` — transactional clone setting `parent_recipe_id`
  - `POST /api/recipes/:id/publish` — draft → published
  - `GET /api/recipes/my` — author's drafts + published
  - `GET /api/recipes/:id/performance` — chef's recipe performance report (views/orders/ratings) from design §3.4.2
- **Accept**: Fork creates new row with parent FK; every filter key returns correct subset; transactional rollback leaves DB clean on failure; performance endpoint returns aggregate rows.
- **Dep**: B01, B02

## B05 · Ingredients API [S]
- **Do**: `routes/ingredients.js`
  - `GET /api/ingredients/search?q=` — LIKE autocomplete, limit 10 (satisfies CS353 flexible-query grading criterion)
  - `GET /api/ingredients/:id/substitutes` — reads `Substitution_Rule`
- **Accept**: Autocomplete responds under 200ms on seed data; returns `[]` for no match.
- **Dep**: B02

## B06 · Shop This Meal / Substitution planner [L]
- **Do**: `routes/substitutions.js`
  - `POST /api/substitutions/plan` body `{ recipe_id, region? }`
  - Returns per ingredient: `{ preferred_supplier_item, price, in_stock, alternatives[] }`
  - Implements the "Shop This Meal" SQL from design report §3.3.4
  - Uses `Supplier_Stock_Status` view
  - Respects each recipe's `Allows_Substitution` whitelist — no swap is offered if the owner didn't allow it
- **Accept**: For a seeded recipe, returns a complete plan; alternatives drawn from `Substitution_Rule` filtered by `Allows_Substitution`; out-of-stock items marked.
- **Dep**: B02, B22, D01

## B10 · Reviews & ratings API [S]
- **Do**: `routes/reviews.js`
  - `POST /api/reviews/recipe/:id` — one per user per recipe
  - `GET /api/reviews/recipe/:id`
  - `DELETE /api/reviews/:id` — own only
- **Accept**: Duplicate review attempt returns 409; aggregate rating reflects in `Recipe_Summary` view.
- **Dep**: B01, B02

## B12 · Home highlights feed (trending + affinity) [M]
- **Do**: `routes/highlights.js`
  - `GET /api/highlights/home` — returns `{ featured[], trending[], recommendations[], active_challenges[] }`
  - `featured`: active `Featured_Selection` rows (admin-curated — see B18)
  - `trending`: top-rated + recent from `Recipe_Summary`
  - `recommendations`: affinity SQL from design report §3.3.2 — scores recipes against the user's flavor profile (`Has_tag_pref` weights). Falls back to trending for logged-out users.
- **Accept**: Endpoint returns four arrays; logged-in users get personalized recommendations ranked by affinity score.
- **Dep**: B01, B02, B18, B19

## B18 · Highlights admin API (Featured_Selection CRUD) [S]
- **Do**: `routes/highlights.js` (admin-scoped subset)
  - `GET /api/admin/highlights` — list all selections, active + past
  - `POST /api/admin/highlights` — create (recipe_id, start_date, end_date, blurb)
  - `PATCH /api/admin/highlights/:id`
  - `DELETE /api/admin/highlights/:id`
  - Admin role required (re-use `requireRole('Administrator')` from B01)
- **Accept**: Admin can curate the "Editor's Picks" strip shown on Home; active selections appear in B12's `featured` array.
- **Dep**: B01, B02

## B19 · Flavor Profile / Affinity API [M]
- **Do**: `routes/flavor-profile.js` (or mount under `/api/users/:id/flavor-profile`)
  - `GET /api/users/:id/flavor-profile` — reads `Has_tag_pref` (tag_id, weight) for the user
  - `PUT /api/users/:id/flavor-profile` — self only, upsert weights for tags the user explicitly selects
  - `POST /api/users/:id/flavor-profile/infer` — auto-infer: update `Has_tag_pref` weights from the user's `Logs_Cook` history and favorites. Implements affinity SQL from design §3.3.2.
  - `GET /api/users/:id/recommendations` — ranked recipes by tag-weight dot product (used by B12)
- **Accept**: Editing the profile on the Profile>Flavor Profile tab persists; cook-logging new recipes nudges the profile on next `infer` call; recommendations reflect the change.
- **Dep**: B01, B02, B20

## B20 · Cook Log API [S]
- **Do**: `routes/cook-log.js` (or mount under `/api/users/:id/cook-log`)
  - `POST /api/users/:id/cook-log` — self only; body `{ recipe_id, cooked_at?, notes? }` — writes `Logs_Cook`
  - `GET /api/users/:id/cook-log` — list with recipe joins, pagination
  - `DELETE /api/users/:id/cook-log/:entryId` — own only
- **Accept**: "I Cooked This" button on RecipeDetail creates a row; Profile>Cook Log tab shows history; duplicates within the same day allowed (tracked separately).
- **Dep**: B01, B02

## B21 · Recipe_Media multi-asset API [S]
- **Do**: Fold into `routes/recipes.js`
  - `GET /api/recipes/:id/media` — list
  - `POST /api/recipes/:id/media` — author only; body `{ url, media_type: 'image'|'video', is_thumbnail? }`. URL is a plain text field (matches mockup).
  - `PATCH /api/recipes/:id/media/:mediaId` — toggle `is_thumbnail`, reorder
  - `DELETE /api/recipes/:id/media/:mediaId`
  - Exactly one media row per recipe may have `is_thumbnail = TRUE` (enforced in handler)
- **Accept**: Recipe can have multiple images + videos; the thumbnail shows on RecipeCard; deleting the thumbnail auto-promotes the next media row.
- **Dep**: B01, B02, B04

## B22 · Allows_Substitution management API [S]
- **Do**: Fold into `routes/recipes.js`
  - `GET /api/recipes/:id/substitutions` — list rows from `Allows_Substitution` for this recipe
  - `POST /api/recipes/:id/substitutions` — author only; body `{ ingredient_id, substitute_ingredient_id }`. Blocked by D04 trigger if the two are equal.
  - `DELETE /api/recipes/:id/substitutions/:subId` — author only
- **Accept**: Recipe owner controls which swaps B06 will offer for their recipe; attempting to allow the same ingredient as its own substitute returns 400/409 (caught from D04 trigger).
- **Dep**: B01, B02, B04, D04

---

# L3 — Backend Commerce & Ops

## B07 · Orders API [L]
- **Do**: `routes/orders.js`
  - `POST /api/orders` — transactional: insert `Order` + `Order_Item[]`; royalty trigger fires automatically. Body matches the `Order` table columns declared in the design report (no shipping-address invention).
  - `GET /api/orders/mine` — customer history
  - `GET /api/orders/supplier` — incoming orders for logged-in supplier
  - `PATCH /api/orders/:id/status` — supplier only; pending → fulfilled → shipped → completed
  - `GET /api/orders/:id` — order + items + status history
- **Accept**: Placing an order inserts a royalty row (verify `trg_update_royalty_on_order` fired); rollback on mid-transaction failure leaves no partial data.
- **Dep**: B01, B02, royalty trigger (done)

## B08 · Suppliers & inventory API [M]
- **Do**: `routes/suppliers.js`
  - `GET /api/suppliers/:id/inventory`
  - `POST /api/suppliers/inventory` — create item
  - `PATCH /api/suppliers/inventory/:id` — update stock/price
  - `DELETE /api/suppliers/inventory/:id`
  - `GET /api/suppliers/stock-status` — reads `Supplier_Stock_Status` view
- **Accept**: Only the supplier owner can mutate; low-stock is reflected correctly in the view.
- **Dep**: B01, B02

## B13 · Challenges API [M]
- **Do**: `routes/challenges.js`
  - `GET /api/challenges` — active + past
  - `GET /api/challenges/:id` — includes submitted entries
  - `POST /api/challenges` — admin only
  - `POST /api/challenges/:id/entries` — submit recipe_id (must be published)
  - `POST /api/challenges/:id/winner` — admin
  - `PATCH /api/challenges/:id` — close / update
- **Accept**: Only published recipes can be submitted; selecting a winner closes the challenge.
- **Dep**: B01, B02, B04

## B14 · Mount routes + CORS + error handler [S]
- **Do**: Wire every new route module into `backend/src/app.js`; add global error middleware; verify CORS permits `http://localhost:5173`.
- **Accept**: Frontend in the browser can `GET /api/recipes` without CORS error; unhandled exception returns a JSON body, not a stack trace.
- **Dep**: B03–B13, B18–B22

---

# Frontend Shared Infrastructure (do early, benefits everyone)

## F01 · API client layer [S]
- **Do**: `frontend/src/api/client.js` — axios instance with `baseURL = http://localhost:3001/api` and an auth interceptor reading the token from localStorage. Create one file per resource: `api/auth.js`, `recipes.js`, `ingredients.js`, `substitutions.js`, `orders.js`, `suppliers.js`, `challenges.js`, `users.js`, `reviews.js`, `highlights.js`, `admin.js`, `cookLog.js`, `flavorProfile.js`.
- **Accept**: No React component imports axios directly — everything goes through `api/*`.
- **Dep**: B03

## F02 · AuthContext + useAuth hook [S]
- **Do**: `frontend/src/context/AuthContext.jsx` providing `user`, `token`, `login()`, `logout()`. Persist to localStorage. Update `App.jsx` and `Navbar.jsx` to consume context instead of props.
- **Accept**: Page refresh keeps user logged in; logout clears storage.
- **Dep**: F01

## F03 · Route guards [S]
- **Do**: `ProtectedRoute.jsx` (opens AuthModal if no user) and `RoleRoute.jsx` (403 fallback for wrong role). Apply to `/create`, `/supplier/*`, `/admin`.
- **Accept**: Logged-out user visiting `/create` sees AuthModal; wrong role sees 403 page.
- **Dep**: F02

## F04 · Shared UI kit [M]
- **Do**: Build these reusable components:
  - `RecipeCard`, `RecipeGrid`
  - `FilterSidebar` (URL-param synced)
  - `StarRating`
  - `ImageUrlInput` — plain text input that validates URL shape and previews the image (design report mockup shows URL input, not a file uploader)
  - `IngredientRow`, `StepRow` (used in CreateRecipe and RecipeDetail)
  - `LoadingSpinner`, `EmptyState`, `Pagination`
  - `Toast`, `ConfirmModal`
- **Accept**: Each component used in at least 2 pages; no inline styles — Tailwind only.
- **Dep**: F01

## F06 · Global error / toast wiring [S]
- **Do**: Add a response interceptor to `api/client.js` that catches non-2xx responses and dispatches a `Toast` with the `error` field. Provide a `ToastProvider` at the App root so any component can `toast.success()` / `toast.error()`.
- **Accept**: A 409 "Email already exists" from register shows a red toast automatically; no component has to `try/catch` for UX.
- **Dep**: F01, F04

## F07 · NotFound page + ErrorBoundary [S]
- **Do**: `pages/NotFound.jsx` (simple 404 UI with link home). Add catch-all `<Route path="*" element={<NotFound />} />` in `App.jsx`. Wrap `<Routes>` in an `ErrorBoundary` component that shows a friendly fallback on render crashes.
- **Accept**: Visiting `/does-not-exist` shows the NotFound page; a thrown render error shows the fallback, not a blank screen.
- **Dep**: F01

## F08 · SubstitutionManager component [S]
- **Do**: `components/SubstitutionManager.jsx` — used inside CreateRecipe (P04) and RecipeDetail (P03, author view only). Lets the recipe owner pick, per ingredient, which substitute ingredients are allowed. Writes to `Allows_Substitution` via B22.
- **Accept**: Owner can add/remove swap permissions; selector prevents picking the same ingredient as its substitute (backed by D04 trigger).
- **Dep**: F04, B22

---

# L4 — Frontend Consumer Pages

## P01 · Home page [M]
- **Do**: `pages/Home.jsx` — hero banner, "Editor's Picks" strip (admin-curated Featured_Selection), "Trending now" grid, "Recommended for you" grid (logged-in only, affinity-ranked), active-challenges strip. Wire to `/api/highlights/home`.
- **Accept**: Logged-out users see featured + trending; logged-in users additionally see personalized row driven by flavor profile.
- **Dep**: F04, B12

## P02 · Recipes discovery page [L]
- **Do**: `pages/Recipes.jsx` — left `FilterSidebar` reading/writing URL params from Navbar dropdown (including prep/cook-time range sliders); right `RecipeGrid` with pagination; loading + empty states.
- **Accept**: Clicking "Italian" in Navbar lands on `/recipes?cuisine=italian` and filters correctly; time-range slider filters via `min_time` / `max_time`; pagination updates URL.
- **Dep**: F04, B04

## P03 · RecipeDetail page [L]
- **Do**: `pages/RecipeDetail.jsx`
  - Hero media carousel (images + videos from `Recipe_Media`)
  - Meta (time, servings, difficulty)
  - Ingredients list and numbered steps
  - Reviews section with `StarRating` + submit form
  - **Shop This Meal** button → opens `SubstitutionPicker` (F05) → "Add to Cart" writes to localStorage
  - **Fork Recipe** button → navigates to `/create?fork=:id`
  - **I Cooked This** button → posts to `/api/users/:id/cook-log` (B20)
  - Royalty attribution badge if `parent_recipe_id` is set
  - Author-only: inline `SubstitutionManager` (F08) to curate allowed swaps
- **Accept**: All CTAs work; cart persists across navigation; fork chain visible on forked recipes; "I Cooked This" shows confirmation and later appears in Profile>Cook Log.
- **Dep**: F04, B04, B06, B10, B20, B21, F05, F08

## P04 · CreateRecipe page [L]
- **Do**: Complete `pages/CreateRecipe.jsx`
  - **FORM CARD**: title, description, cover image (`ImageUrlInput`), media manager (add more image/video URLs with `Recipe_Media` is_thumbnail toggle), ingredient repeater (with `/api/ingredients/search` autocomplete), step repeater, tags (category/cuisine/diet/meal/dish-type), difficulty, prep time, cook time, servings, `SubstitutionManager` section
  - **DETAILS CARD**: publish toggle, tips, "Save Draft" / "Publish" buttons
  - Support `?fork=:id` query param — prefill from source recipe
  - Submit → `POST /api/recipes` (one transactional call handles recipe + ingredients + steps + tags + media + substitutions)
- **Accept**: Can create from scratch and fork; validation errors show inline; success redirects to RecipeDetail; forked recipe preserves allowed-substitution rows unless the user edits them.
- **Dep**: F04, B04, B05, B21, B22, F08

## P07 · Profile page [M]
- **Do**: Replace placeholder in `pages/Profile.jsx`
  - Header: avatar, bio
  - Tabs: **My Recipes** · **Meal Lists** · **Cook Log** · **Orders** · **Flavor Profile** · **Royalties** (chefs only — includes Royalty Statistics and Recipe Performance reports from design §3.4.2, satisfying CS353 2-reports grading criterion)
  - Edit-profile modal
- **Accept**: All tabs populate from API; edit persists to DB; chef's Royalties tab shows both the aggregate royalty statistics and per-recipe performance rows.
- **Dep**: F04, B04, B07, B09, B20

## P13 · Profile > Flavor Profile tab [S]
- **Do**: Inside `pages/Profile.jsx` implement the Flavor Profile tab (design §3.3.2)
  - Read `/api/users/:id/flavor-profile` — show current tag weights as sliders / chips
  - Let user manually adjust weights (save → PUT)
  - "Refresh from my cook log" button → POST to `/flavor-profile/infer`
  - Explanation panel: "Your flavor profile drives the Recommended for You row on Home."
- **Accept**: Editing weights changes Home recommendations next visit; infer button observably updates weights after a fresh cook-log entry.
- **Dep**: F04, B19, B20, P07

---

# L5 — Frontend Commerce / Ops Pages

## P05 · Checkout page [M]
- **Do**: `pages/Checkout.jsx` — reads cart from localStorage, groups items by supplier, "Place Order" → `POST /api/orders` → clear cart → redirect to confirmation.
- **Accept**: Order appears in Profile > Orders and in SupplierOrders; royalty visible on chef's profile afterward.
- **Dep**: F04, B07, P03

## P06 · Challenges pages [M]
- **Do**: `pages/Challenges.jsx` (list view — active + past) + detail view inside (entries grid + submit-entry button for eligible users).
- **Accept**: Submit picks from user's published recipes; winner banner shows when set.
- **Dep**: F04, B13

## P08 · SupplierDashboard [M]
- **Do**: `pages/SupplierDashboard.jsx` — KPI cards (open orders count, low-stock count, revenue this month), recent orders list, low-stock alerts (from `Supplier_Stock_Status`).
- **Accept**: Numbers match direct DB queries; KPI cards link to relevant pages.
- **Dep**: F04, B07, B08

## P09 · SupplierInventory [M]
- **Do**: `pages/SupplierInventory.jsx` — CRUD table with add-item modal, inline edit for stock/price, delete with confirm, search/filter.
- **Accept**: Changes reflect immediately; low-stock badge appears below threshold.
- **Dep**: F04, B08

## P10 · SupplierOrders [M]
- **Do**: `pages/SupplierOrders.jsx` — incoming orders list with status dropdown (pending → fulfilled → shipped → completed). Order detail drawer with items and customer info.
- **Accept**: Status change persists; customer sees update in their Orders tab.
- **Dep**: F04, B07

## P11 · AdminPanel [M]
- **Do**: `pages/AdminPanel.jsx` — tabs: **Pending Chef Approvals** (approve/reject) · **Content Moderation** · **Ingredients** (add/edit/delete) · **Users** (view/suspend).
- **Accept**: Chef approval flips verification status and unlocks Create access for that user; ingredient CRUD round-trips through B11.
- **Dep**: F04, B11

## P12 · AdminHighlights page [S]
- **Do**: `pages/AdminHighlights.jsx` (or additional tab on P11) — admin curates `Featured_Selection`: add recipe, set active window, write blurb, deactivate. Pulls from `GET /api/admin/highlights` (B18).
- **Accept**: Rows created here appear in the Home "Editor's Picks" strip the next refresh; inactive rows disappear after end_date.
- **Dep**: F04, B18

## F05 · SubstitutionPicker component [M]
- **Do**: `components/SubstitutionPicker.jsx` — modal showing per-ingredient supplier options + substitute alternatives from `/api/substitutions/plan`. "Add all to cart" action.
- **Accept**: Shows prices and availability; disabled for out-of-stock items; only alternatives permitted by the recipe's `Allows_Substitution` appear.
- **Dep**: F04, B06

---

# X — Cross-cutting

| ID | Task | Effort | Owner |
|---|---|---|---|
| X01 | `.gitignore` audit + `.env.example` kept in sync | S | Dev A |
| X02 | `README.md` — setup, DB init, run instructions, architecture overview | M | Dev A |
| X03 | Postman / Thunder Client collection for all API endpoints | S | Dev C |
| X04 | End-to-end smoke test checklist: register → browse → fork → Shop This Meal → order → supplier fulfill → royalty visible → cook log → flavor profile updates | S | Dev E |
| X05 | Demo script + in-group rehearsal | S | Dev E (lead) |
| X06 | Final report update (post-implementation deltas, if required) | M | Dev E + Dev B |
| X07 | Screenshots / screen recording for submission | S | Dev C |
| X08 | Shared tag-constants file (single source for cuisine/diet/category/meal/dish-type values used in Navbar + filter UI + backend filter endpoint) | S | Dev D |

---

# DB-features-must-fire checklist (for grading)

These advanced DB components must be reachable from the UI. Each team member confirms their feature exercises the relevant component:

- [ ] `Recipe_Summary` view — used by P02 Recipes discovery and B12 home feed
- [ ] `Supplier_Stock_Status` view — used by P08 SupplierDashboard and F05 SubstitutionPicker
- [ ] `trg_update_royalty_on_order` trigger — fires on P05 Checkout; royalty surfaced on P07 Profile > Royalties
- [ ] `trg_allows_substitution_check` trigger (D04) — blocks equal ingredient/substitute writes from B22 / F08
- [ ] Transactions — recipe create (B04), recipe fork (B04), order placement (B07), chef approval (B11)
- [ ] Every SQL query from design report §3 is reachable from a UI action
- [ ] Two reports (design §3.4.2): Royalty Statistics + Recipe Performance — both rendered on P07 Royalties tab
- [ ] Range query + flexible LIKE query — P02 prep/cook-time slider (range) + B05 ingredient autocomplete (LIKE)

---

# Dependency graph

```
B01 Auth ──► B02 DB utils ──► all other B##
                               │
                               ├──► F01 API client ──► F02 AuthContext ──► F03 Guards ──► all P##
                               │
                               └──► F04 UI kit ─────────────────────────► all P##

D01 Seed ─► every page + demo
D04 Constraint trigger ─► B22 / F08
```

**Critical path** — start these immediately, they unblock everyone else:
**B01 → B02 → F01 → F02 → D01**

---

# Suggested 3-sprint plan (~3 weeks)

### Sprint 1 — Unblock everything
- **Dev A (L1)**: B01, B02, B03, B15, D01, D04
- **Dev B (L2)**: B04 (GET endpoints first)
- **Dev C (L3)**: B14 stub (routes mounted but empty)
- **Dev D (Shared)**: F01, F02, F03, F04, F07, X08 — delivering the UI kit unblocks Dev E on every page
- **Dev E (FE)**: P04 scaffold (form layout, fields, buttons) — API wiring deferred to Sprint 2 once B05 / B21 / B22 / F08 land; P02 skeleton once F04 lands

### Sprint 2 — Core loops
- **Dev A (L1)**: B09, B11, B17, D02
- **Dev B (L2)**: B04 (write endpoints), B05, B06, B21, B22
- **Dev C (L3)**: B07, B08
- **Dev D (Shared)**: F06, D03 audit started
- **Dev E (FE)**: P01, P02 (finish), P03, P07, F08

### Sprint 3 — Ops + polish + design-report extras
- **Dev A (L1)**: X01, X02
- **Dev B (L2)**: B10, B12, B18, B19, B20, D03 (finish)
- **Dev C (L3)**: B13, X03, X07
- **Dev D (Shared)**: pairs with Dev E on any frontend gaps — available as extra hands if a page slips
- **Dev E (FE)**: P05, P06, P08, P09, P10, P11, P12, P13, F05
- **Everyone**: X04, X05, X06

---

# Master checklist

Tick each as it merges to `main`. When every box is checked, the project is finalized.

### Backend
- [ ] B01 · Auth middleware + session
- [ ] B02 · DB helpers + error convention
- [ ] B03 · Update auth.js to issue tokens
- [ ] B04 · Recipes API
- [ ] B05 · Ingredients API
- [ ] B06 · Shop This Meal / Substitution planner
- [ ] B07 · Orders API
- [ ] B08 · Suppliers & inventory API
- [ ] B09 · Users / profile API
- [ ] B10 · Reviews & ratings API
- [ ] B11 · Admin API
- [ ] B12 · Home highlights feed
- [ ] B13 · Challenges API
- [ ] B14 · Mount routes + CORS + error handler
- [ ] B15 · Password hashing (bcrypt)
- [ ] B17 · Request validation middleware
- [ ] B18 · Highlights admin API (Featured_Selection CRUD)
- [ ] B19 · Flavor Profile / Affinity API
- [ ] B20 · Cook Log API
- [ ] B21 · Recipe_Media multi-asset API
- [ ] B22 · Allows_Substitution management API

### Database
- [ ] D01 · Seed script
- [ ] D02 · DB reset script
- [ ] D03 · Design-report §3 query map + table-coverage audit
- [ ] D04 · is_ingrd_different trigger

### Frontend shared
- [x] F01 · API client layer
- [x] F02 · AuthContext + useAuth
- [x] F03 · Route guards
- [x] F04 · Shared UI kit
- [ ] F05 · SubstitutionPicker component
- [x] F06 · Global error / toast wiring
- [x] F07 · NotFound page + ErrorBoundary
- [x] F08 · SubstitutionManager component

### Pages
- [x] P01 · Home
- [x] P02 · Recipes discovery
- [x] P03 · RecipeDetail
- [x] P04 · CreateRecipe
- [ ] P05 · Checkout
- [x] P06 · Challenges
- [x] P07 · Profile
- [ ] P08 · SupplierDashboard
- [ ] P09 · SupplierInventory
- [ ] P10 · SupplierOrders
- [ ] P11 · AdminPanel
- [ ] P12 · AdminHighlights
- [x] P13 · Profile > Flavor Profile tab

### Cross-cutting
- [ ] X01 · .gitignore / .env.example audit
- [ ] X02 · README.md
- [ ] X03 · Postman collection
- [ ] X04 · End-to-end smoke test
- [ ] X05 · Demo rehearsal
- [ ] X06 · Final report update
- [ ] X07 · Screenshots / recording
- [x] X08 · Shared tag-constants file

### DB features exercised
- [ ] `Recipe_Summary` view reachable from UI
- [ ] `Supplier_Stock_Status` view reachable from UI
- [ ] `trg_update_royalty_on_order` trigger fires from UI
- [ ] `trg_allows_substitution_check` trigger blocks equal-ingredient writes
- [ ] Transactions used on all multi-row inserts
- [ ] Every design-report §3 SQL query reachable
- [ ] 2 reports rendered on P07 Royalties tab (Royalty Statistics + Recipe Performance)
- [ ] Range query + flexible LIKE query reachable from UI

---

**Total tasks: 54** (21 backend + 4 DB + 8 frontend-shared + 13 pages + 8 cross-cutting) · plus 8 DB-feature grading checks

When every checkbox above is ticked, RecipeRoom is finalized.
