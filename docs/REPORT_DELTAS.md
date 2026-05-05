# Implementation deltas vs. Design Report

Things that ended up different from the original design report. Each is
explained briefly with the reason and the resulting place in the codebase.
Use this to update the final report before submission.

## Schema additions (4 new tables)
Added during implementation to back features the design report mentioned at
the UX level but didn't specify schema for:

| Table | Backs | Why added |
|---|---|---|
| `Likes_Recipe` | recipe heart on RecipeDetail and RecipeCard | report describes "likes" but doesn't define a table |
| `Saves_Recipe` | bookmark icon → Profile › Saved | needed a `saved_at` to order the saved list |
| `Follows_User` | Follow button on author row + Profile follower/following counts | report mentions following relationship in §3.3.x without schema |
| `Likes_Review` | heart on each comment under a recipe | comment-likes are surfaced in the figma but absent from the design schema |

`Follows_User` was originally specified with a `CHECK (follower_id <> followee_id)`;
MySQL forbids CHECK constraints on FK-cascade columns (same restriction that
forced `is_ingrd_different` to be a trigger). The check is enforced at the
route layer instead.

## Endpoint additions on top of B-spec
| Endpoint | Reason |
|---|---|
| `GET /api/admin/users` | Design report had no admin user listing endpoint, AdminPanel UI needs it |
| `GET /api/admin/pending-suppliers` + `POST /admin/suppliers/:id/approve\|reject` | Mirror of chef verification; report only spec'd chef variants |
| `POST/GET /api/recipes/:id/like` and `/save` | Backs the four new schema tables above |
| `POST /api/reviews/like` and `GET /api/reviews/recipe/:id/likes` | Comment-likes |
| `POST/GET /api/users/:id/follow`, `GET /api/users/:id/saved` | Follow graph + saved list |
| `GET /api/orders/mine` | Frontend's Profile Orders tab expected this; spec only had `/orders/:id` |

## Frontend deviations from figma
- **P02 Recipes — cooking-time filter** is rendered as **range pills**
  (`Under 15 / 15-30 / 30-60 / Over 60`) per figma, not the dual-handle
  range slider the spec mentions. Both produce equivalent `min_time/max_time`
  query params.
- **P12 AdminHighlights** was implemented as a **tab inside P11 AdminPanel**
  (Featured Selections) rather than a standalone page. The TASKS.md spec
  explicitly allowed this ("`pages/AdminHighlights.jsx` — or additional tab on P11").
- **Profile tabs**: figma included `Saved` and `Liked` tabs; the implementation
  has `Saved` (real, backed by `Saves_Recipe`) but **`Liked` was dropped** —
  recipe likes are visible on the recipe itself (heart count) and there's no
  separate "my liked recipes" view to avoid redundancy with Saved.

## Behavioral choices worth flagging
- **Fork** navigates to `/create?fork=:id` and prefills the form rather than
  immediately publishing a duplicate. The draft is only persisted when the
  user explicitly hits Publish. This matches the spec's "support `?fork=:id`
  query param — prefill from source recipe" line.
- **Order shape**: `Orders` table stores one recipe per row; carts with
  multiple recipes fire one `POST /orders` per recipe inside a loop in
  `Checkout.completeOrder`. Delivery address + payment method are collected
  in the form for UX completeness but **not persisted** (no schema columns
  for them).
- **Substitution planner contract**: planner returns base-quantity prices.
  Cart and Checkout do the servings scaling at render time. This avoids
  double-scaling when the user changes servings on the cart page.
- **Recipe difficulty** lookup is case-insensitive on the frontend
  (`recipe.difficulty.toLowerCase()`), since seed data uses `'Easy'` while
  the figma styling map is keyed `easy`.

## Things deferred or not implemented
- **Real payments**: form collects payment method but no processor is
  integrated. Out of scope.
- **Notifications system**: design mentions "user notifications" in passing;
  not built — toast messages cover the in-session feedback case.
- **Images**: seed uses `example.com` URLs which 404; RecipeCard handles via
  `onError` fallback. Not a code bug, just placeholder seed data.

## Patches applied to other developers' files (with permission)
All append-only — no existing logic changed.

| File | Original author | Our additions |
|---|---|---|
| `backend/src/routes/admin.js` | Dev A | 4 endpoints (users + supplier verification) |
| `backend/src/routes/users.js` | Dev A | follow toggle, follow state, saved list |
| `backend/src/routes/recipes.js` | Dev B | recipe like/save toggle + state |
| `backend/src/routes/reviews.js` | Dev B | comment like toggle, comment-likes summary |
| `backend/src/routes/orders.js` | Dev C | `GET /orders/mine` (inserted before `/:id`) |
| `db/init.sql` | Dev E | 4 new tables (`Likes_Recipe`, `Saves_Recipe`, `Follows_User`, `Likes_Review`) |
| `frontend/src/api/*.js` | Dev D | new wrappers + a small response normalizer for the challenges + admin highlights endpoints |

## DB-feature grading checklist — where each is exercised
- `Recipe_Summary` view → `GET /api/recipes` list (Recipes discovery page)
- `Supplier_Stock_Status` view → `GET /api/suppliers/stock-status` (used by SubstitutionPicker via the planner)
- `trg_update_royalty_on_order` → fires when buyer completes checkout in Act 1 of the demo
- `trg_allows_substitution_check` → blocks `INSERT` where original_item_id = substitute_item_id, demonstrated in CreateRecipe
- Transactions → `withTransaction` wraps recipe create, recipe fork, order placement, chef approval
- Range query → cooking-time pills map to `min_time/max_time` filter on `/recipes`
- LIKE query → `/api/ingredients/search` autocomplete in IngredientRow + SubstitutionPicker
- Two reports (§3.4.2) → both rendered on Profile › Royalties tab for chefs
