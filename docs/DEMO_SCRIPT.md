# Demo script

A 12–15 minute walkthrough that hits every grading-relevant feature in one
narrative arc. Three browser windows, three roles. Reset the DB right before
demo so counts and seeds line up with this script.

## Pre-flight (5 min before, off-camera)
1. `./db/reset.sh`
2. `npm --prefix backend start` — confirm port 3001
3. `npm --prefix frontend run dev` — confirm port 5173
4. Open three browser windows side by side:
   - **Window A** — logged out, will become Home Cook (the buyer)
   - **Window B** — log in as a seeded Verified Chef
   - **Window C** — log in as the seeded Administrator
5. Each window: navigate to `/` so you can switch fast during the demo

## Act 1 — The buyer journey (5 min)
> "RecipeRoom is a culinary discovery and meal-kit marketplace.
>  Let's start as someone new browsing for dinner ideas."

In **Window A**:
1. **Sign up** as a Home Cook from the modal — show the role-aware nav
2. **Home page** — point out the four sections: Hero search, quick filters,
   feed tabs (For You / Trending / Recent / Following), Challenges, Recommended For You
3. Click **Italian** quick filter → land on `/recipes?cuisine=italian`
4. Use the **Filter sidebar** (cuisine + difficulty + dietary) to narrow it
5. Open **Spaghetti Pomodoro**
   - Show the **media carousel**, ingredients, instructions, comments
   - Click the **heart** — count goes from 0 to 1
   - Click the **bookmark** — saves the recipe
   - Click **Follow** on the chef
6. **I Cooked This** — toast confirms; we'll see it later under Cook Log
7. Post a comment with a 5-star rating; **like the comment** — count flips
8. **Add to Cart** → substitution picker opens
   - Show the **planner** has fetched real supplier prices
   - Pick a substitute on one row to demonstrate the schema's
     `Allows_Substitution` table is being read
   - **Add to Cart** — navbar badge increments
9. `/cart` — adjust servings, watch totals scale; **Proceed to Checkout**
10. Three-step checkout: Review → Delivery → Payment → **Complete Order**
    - This fires `trg_update_royalty_on_order` server-side
11. Profile → **Orders** tab — order is there with `Pending`
12. Profile → **Cook Log** — Spaghetti Pomodoro is logged
13. Profile → **Saved** — bookmarked recipe appears
14. Profile → **Flavor Profile** — add Tomato at 80, save

## Act 2 — Royalty visible (1 min)
Switch to **Window B** (the Chef who owns Spaghetti Pomodoro):
1. Profile → **Royalties** tab
2. Total Points incremented from the order in Act 1
3. Per-recipe performance row shows the recipe with order count
4. This is the **two reports** required by the design report §3.4.2

## Act 3 — Recipe authoring (2 min)
Still in **Window B** (Chef):
1. **Create** → fill the form with autocomplete-resolved ingredients
2. Use **Allowed Substitutions** card to whitelist swaps
3. **Publish Recipe** → land on the new recipe page
4. Open another recipe → **Fork This Recipe** → form prefills with `(fork)` suffix
5. Tweak and Publish — second recipe appears

## Act 4 — Supplier ops (2 min)
Open a **fourth window** logged in as a seeded Local Supplier:
1. `/supplier` — Dashboard with live KPIs and Recent Orders / Low Stock
2. `/supplier/inventory` — search, edit stock + price inline, add a new item
3. `/supplier/orders` — the order from Act 1 is visible here
4. Move it `Pending → Confirmed → Ready → Completed`
5. Expand the row to show line items + subtotals

## Act 5 — Admin moderation (2 min)
Switch to **Window C** (Administrator):
1. `/admin` — Overview KPIs + Pending Verification Requests alert
2. **User Management** — every user in one table with role pills
3. **Verifications** — Approve a chef and reject a supplier candidate
4. **Recipe Management** — Move the new chef recipe into a Featured Selection
5. **Featured Selections** — create a fresh selection with two recipes
6. Switch back to **Window A** → `/` shows the new featured recipes on Home

## Act 6 — Challenges (1 min)
Back in **Window A**:
1. `/challenges` — Active and Completed tabs
2. Join an active challenge — counter increments
3. **Log Recipe** modal — submit your published recipe to the challenge
4. **Leaderboard** modal shows participants with progress + (You)

## DB-feature wrap-up (45 sec)
Quickly call out the schema features in play:
- `Recipe_Summary` view — backs the Recipes discovery query
- `Supplier_Stock_Status` view — drives the substitution planner
- `trg_update_royalty_on_order` — fired in Act 1, observed in Act 2
- `trg_allows_substitution_check` — blocks self-substitutions (briefly try
  to add `Tomato → Tomato` in CreateRecipe to show the 409)
- Transactions: recipe create, recipe fork, order placement, chef approval
  all wrap their multi-row writes
- LIKE query: ingredient autocomplete; range query: prep/cook-time filters

## Q&A — common questions
- **"Why are some prices unrealistic?"** — seed data uses placeholder
  prices; the math + flow are correct.
- **"What about real images?"** — seed uses `example.com` URLs; the
  RecipeCard has an `onError` fallback so the chef-hat icon shows.
- **"Why no payment processing?"** — out of scope; the form collects
  delivery + payment for UX completeness, only the order rows persist.
