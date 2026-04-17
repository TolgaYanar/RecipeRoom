# RecipeRoom — Project Finalization Task List

This document enumerates **every task** required to finish RecipeRoom. When all tasks here are complete and checked off, the project is done.

- **Stack**: MySQL · Node.js/Express (raw SQL, no ORM) · React (Vite) + Tailwind CSS
- **Team**: 5 developers (Bilkent CS353, Group 7)
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

## Team swim lanes

Each lane is a cohesive area of ownership. Assign one per dev; shared work (F01–F04) is collaborative.

| Lane | Focus | Owns task IDs |
|---|---|---|
| **L1 — Backend Core & Auth** | Auth, users, admin, DB utils, seed | B01–B03, B09, B11, D01, D02 |
| **L2 — Backend Recipes & Content** | Recipes, ingredients, substitutions, reviews, highlights | B04, B05, B06, B10, B12 |
| **L3 — Backend Commerce & Ops** | Orders, suppliers, inventory, challenges | B07, B08, B13, B14 |
| **L4 — Frontend Consumer Side** | Home, Recipes, RecipeDetail, CreateRecipe, Profile | P01, P02, P03, P04, P07 |
| **L5 — Frontend Commerce/Ops Side** | Checkout, Challenges, Supplier pages, Admin, SubstitutionPicker | P05, P06, P08, P09, P10, P11, F05 |
| **Shared** | API client, auth context, route guards, UI kit | F01, F02, F03, F04 |

---

## Status snapshot (as of today)

- Database schema, views, and royalty trigger — **done**
- `backend/src/routes/auth.js` (login + 4 register endpoints) — **done**
- `frontend/src/components/Navbar.jsx` (with mega dropdown) — **done**
- `frontend/src/components/AuthModal.jsx` — **done**
- `frontend/src/App.jsx` routing skeleton — **done**
- `frontend/src/pages/CreateRecipe.jsx` header — **in progress**
- All other pages — **placeholder files only**

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
  - `GET /api/users/:id/favorites`
  - `GET /api/users/:id/royalties` — chefs only
  - `POST /api/users/:id/follow` and `DELETE /api/users/:id/follow`
- **Accept**: Ownership enforced on PATCH; royalties endpoint returns rows from `Earns_Royalty` table.
- **Dep**: B01, B02

## B11 · Admin API [M]
- **Do**: `routes/admin.js`
  - `GET /api/admin/pending-chefs` — chefs with `verification_status = 'PENDING'`
  - `POST /api/admin/chefs/:id/approve`
  - `POST /api/admin/chefs/:id/reject`
  - `GET /api/admin/reports`
  - `POST /api/admin/content/:type/:id/moderate`
- **Accept**: All routes require `Administrator` role; approval flips `verification_status` to `VERIFIED`.
- **Dep**: B01, B02

## D01 · Seed script [M]
- **Do**: `db/seed.sql` — populate:
  - 2 verified chefs, 3 home cooks, 2 suppliers, 1 admin
  - ~10 recipes across cuisines (some forks, some originals), each with ingredients and steps
  - 1 active challenge, 1 past challenge with winner
  - 3 sample completed orders
  - Substitution rules covering common ingredients
  - Supplier inventory for each supplier
- **Accept**: `mysql -u root -p reciperoom < db/seed.sql` leaves a demo-ready DB (no empty pages during demo).
- **Dep**: Schema (done)

## D02 · DB reset script [S]
- **Do**: `db/reset.sh` — runs `init.sql` then `seed.sql` in one command.
- **Accept**: `./db/reset.sh` returns DB to clean demo state.
- **Dep**: D01

---

# L2 — Backend Recipes & Content

## B04 · Recipes API [L]
- **Do**: `routes/recipes.js`
  - `GET /api/recipes` — filters: `?category=&cuisine=&diet=&ingredient=&dish_type=&meal=&popular=&q=&page=&limit=` (keys match Navbar dropdown values). Use `Recipe_Summary` view.
  - `GET /api/recipes/:id` — joins ingredients, steps, reviews, parent recipe
  - `POST /api/recipes` — transactional: insert `Recipe` + `Recipe_Ingredient[]` + `Recipe_Step[]` + tag rows
  - `PUT /api/recipes/:id` — author only
  - `DELETE /api/recipes/:id` — author only
  - `POST /api/recipes/:id/fork` — transactional clone setting `parent_recipe_id`
  - `POST /api/recipes/:id/publish` — draft → published
  - `GET /api/recipes/my` — author's drafts + published
- **Accept**: Fork creates new row with parent FK; every filter key returns correct subset; transactional rollback leaves DB clean on failure.
- **Dep**: B01, B02

## B05 · Ingredients API [S]
- **Do**: `routes/ingredients.js`
  - `GET /api/ingredients/search?q=` — LIKE autocomplete, limit 10
  - `GET /api/ingredients/:id/substitutes` — reads `Substitution_Rule`
- **Accept**: Autocomplete responds under 200ms on seed data; returns `[]` for no match.
- **Dep**: B02

## B06 · Shop This Meal / Substitution planner [L]
- **Do**: `routes/substitutions.js`
  - `POST /api/substitutions/plan` body `{ recipe_id, region? }`
  - Returns per ingredient: `{ preferred_supplier_item, price, in_stock, alternatives[] }`
  - Implements the "Shop This Meal" SQL from design report §3
  - Uses `Supplier_Stock_Status` view
- **Accept**: For a seeded recipe, returns a complete plan; alternatives drawn from `Substitution_Rule` + `Allows_Substitution`; out-of-stock items marked.
- **Dep**: B02, D01

## B10 · Reviews & ratings API [S]
- **Do**: `routes/reviews.js`
  - `POST /api/reviews/recipe/:id` — one per user per recipe
  - `GET /api/reviews/recipe/:id`
  - `DELETE /api/reviews/:id` — own only
- **Accept**: Duplicate review attempt returns 409; aggregate rating reflects in `Recipe_Summary` view.
- **Dep**: B01, B02

## B12 · Home highlights feed [M]
- **Do**: `routes/highlights.js`
  - `GET /api/highlights/home` — returns `{ trending[], recommendations[], active_challenges[] }`
  - Trending: top-rated + recent from `Recipe_Summary`
  - Recommendations: affinity SQL from design report §3 (based on user's favorites/history) when logged in; falls back to trending otherwise
- **Accept**: Endpoint returns three arrays; logged-in users get personalized recommendations.
- **Dep**: B01, B02

---

# L3 — Backend Commerce & Ops

## B07 · Orders API [L]
- **Do**: `routes/orders.js`
  - `POST /api/orders` — transactional: insert `Order` + `Order_Item[]`; royalty trigger fires automatically
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
- **Dep**: B03–B13

---

# Frontend Shared Infrastructure (do early, benefits everyone)

## F01 · API client layer [S]
- **Do**: `frontend/src/api/client.js` — axios instance with `baseURL = http://localhost:3001/api` and an auth interceptor reading the token from localStorage. Create one file per resource: `api/auth.js`, `recipes.js`, `ingredients.js`, `substitutions.js`, `orders.js`, `suppliers.js`, `challenges.js`, `users.js`, `reviews.js`, `highlights.js`, `admin.js`.
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
  - `ImageUploader`
  - `IngredientRow`, `StepRow` (used in CreateRecipe and RecipeDetail)
  - `LoadingSpinner`, `EmptyState`, `Pagination`
  - `Toast`, `ConfirmModal`
- **Accept**: Each component used in at least 2 pages; no inline styles — Tailwind only.
- **Dep**: F01

---

# L4 — Frontend Consumer Pages

## P01 · Home page [M]
- **Do**: `pages/Home.jsx` — hero banner, "Trending now" grid, "Recommended for you" grid (logged-in only), active-challenges strip. Wire to `/api/highlights/home`.
- **Accept**: Logged-out users see trending only; logged-in users see personalized row.
- **Dep**: F04, B12

## P02 · Recipes discovery page [L]
- **Do**: `pages/Recipes.jsx` — left `FilterSidebar` reading/writing URL params from Navbar dropdown; right `RecipeGrid` with pagination; loading + empty states.
- **Accept**: Clicking "Italian" in Navbar lands on `/recipes?cuisine=italian` and filters correctly; pagination updates URL.
- **Dep**: F04, B04

## P03 · RecipeDetail page [L]
- **Do**: `pages/RecipeDetail.jsx`
  - Hero image + meta (time, servings, difficulty)
  - Ingredients list and numbered steps
  - Reviews section with `StarRating` + submit form
  - **Shop This Meal** button → opens `SubstitutionPicker` modal → "Add to Cart" writes to localStorage
  - **Fork Recipe** button → navigates to `/create?fork=:id`
  - Royalty attribution badge if `parent_recipe_id` is set
- **Accept**: All CTAs work; cart persists across navigation; fork chain visible on forked recipes.
- **Dep**: F04, B04, B06, B10, F05

## P04 · CreateRecipe page [L]
- **Do**: Complete `pages/CreateRecipe.jsx`
  - **FORM CARD**: title, description, cover image (ImageUploader), ingredient repeater (with `/api/ingredients/search` autocomplete), step repeater, tags (category/cuisine/diet/meal/dish-type), difficulty, prep time, cook time, servings
  - **DETAILS CARD**: publish toggle, tips, "Save Draft" / "Publish" buttons
  - Support `?fork=:id` query param — prefill from source recipe
  - Submit → `POST /api/recipes`
- **Accept**: Can create from scratch and fork; validation errors show inline; success redirects to RecipeDetail.
- **Dep**: F04, B04, B05

## P07 · Profile page [M]
- **Do**: Replace placeholder in `pages/Profile.jsx`
  - Header: avatar, bio, follow button (others' profiles)
  - Tabs: **My Recipes** · **Favorites** · **Orders** · **Royalties** (chefs only)
  - Edit-profile modal
- **Accept**: All tabs populate from API; edit persists to DB.
- **Dep**: F04, B04, B07, B09

---

# L5 — Frontend Commerce / Ops Pages

## P05 · Checkout page [M]
- **Do**: `pages/Checkout.jsx` — reads cart from localStorage, groups items by supplier, shipping address form, "Place Order" → `POST /api/orders` → clear cart → redirect to confirmation.
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
- **Do**: `pages/AdminPanel.jsx` — tabs: **Pending Chef Approvals** (approve/reject) · **Reports** (moderate content) · **Users** (view/suspend).
- **Accept**: Chef approval flips verification status and unlocks Create access for that user.
- **Dep**: F04, B11

## F05 · SubstitutionPicker component [M]
- **Do**: `components/SubstitutionPicker.jsx` — modal showing per-ingredient supplier options + substitute alternatives from `/api/substitutions/plan`. "Add all to cart" action.
- **Accept**: Shows prices and availability; disabled for out-of-stock items.
- **Dep**: F04, B06

---

# X — Cross-cutting

| ID | Task | Effort | Owner |
|---|---|---|---|
| X01 | `.gitignore` audit + `.env.example` kept in sync | S | Dev A |
| X02 | `README.md` — setup, DB init, run instructions, architecture overview | M | Dev A |
| X03 | Postman / Thunder Client collection for all API endpoints | S | Dev B |
| X04 | End-to-end smoke test checklist: register → browse → fork → Shop This Meal → order → supplier fulfill → royalty visible | S | Dev D |
| X05 | Demo script + in-group rehearsal | S | Tolga (lead) |
| X06 | Final report update (post-implementation deltas, if required) | M | Tolga + Dev C |
| X07 | Screenshots / screen recording for submission | S | Dev E |

---

# DB-features-must-fire checklist (for grading)

These advanced DB components must be reachable from the UI. Each team member confirms their feature exercises the relevant component:

- [ ] `Recipe_Summary` view — used by P02 Recipes discovery and B12 home feed
- [ ] `Supplier_Stock_Status` view — used by P08 SupplierDashboard and F05 SubstitutionPicker
- [ ] `trg_update_royalty_on_order` trigger — fires on P05 Checkout; royalty surfaced on P07 Profile > Royalties
- [ ] Transactions — recipe create (B04), recipe fork (B04), order placement (B07), chef approval (B11)
- [ ] Every SQL query from design report §3 is reachable from a UI action

---

# Dependency graph

```
B01 Auth ──► B02 DB utils ──► all other B##
                               │
                               ├──► F01 API client ──► F02 AuthContext ──► F03 Guards ──► all P##
                               │
                               └──► F04 UI kit ─────────────────────────► all P##

D01 Seed ─► every page + demo
```

**Critical path** — start these immediately, they unblock everyone else:
**B01 → B02 → F01 → F02 → D01**

---

# Suggested 3-sprint plan (~3 weeks)

### Sprint 1 — Unblock everything
- Dev A: B01, B02, B03, D01
- Dev B: B04 (GET endpoints first)
- Dev C: B14 stub (routes mounted but empty)
- Dev D: F01, F02, F03, F04
- Dev E: P10 skeleton

### Sprint 2 — Core loops
- Dev A: B09, D02
- Dev B: B04 (write endpoints), B05, B06
- Dev C: B07, B08
- Dev D: P02, P03, P04
- Dev E: P05, P09, P10 (finish)

### Sprint 3 — Ops + polish
- Dev A: B11, X02
- Dev B: B10, B12
- Dev C: B13
- Dev D: P01, P07
- Dev E: P06, P08, P11, F05, X07
- Everyone: X04, X05

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

### Database
- [ ] D01 · Seed script
- [ ] D02 · DB reset script

### Frontend shared
- [ ] F01 · API client layer
- [ ] F02 · AuthContext + useAuth
- [ ] F03 · Route guards
- [ ] F04 · Shared UI kit
- [ ] F05 · SubstitutionPicker component

### Pages
- [ ] P01 · Home
- [ ] P02 · Recipes discovery
- [ ] P03 · RecipeDetail
- [ ] P04 · CreateRecipe
- [ ] P05 · Checkout
- [ ] P06 · Challenges
- [ ] P07 · Profile
- [ ] P08 · SupplierDashboard
- [ ] P09 · SupplierInventory
- [ ] P10 · SupplierOrders
- [ ] P11 · AdminPanel

### Cross-cutting
- [ ] X01 · .gitignore / .env.example audit
- [ ] X02 · README.md
- [ ] X03 · Postman collection
- [ ] X04 · End-to-end smoke test
- [ ] X05 · Demo rehearsal
- [ ] X06 · Final report update
- [ ] X07 · Screenshots / recording

### DB features exercised
- [ ] `Recipe_Summary` view reachable from UI
- [ ] `Supplier_Stock_Status` view reachable from UI
- [ ] `trg_update_royalty_on_order` trigger fires from UI
- [ ] Transactions used on all multi-row inserts
- [ ] Every design-report §3 SQL query reachable

---

**Total tasks: 45** (14 backend + 2 DB + 5 frontend-shared + 11 pages + 7 cross-cutting + 6 DB-feature checks)

When every checkbox above is ticked, RecipeRoom is finalized.
