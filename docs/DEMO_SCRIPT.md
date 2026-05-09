# RecipeRoom — Demo Script

A 12–15 minute walkthrough that touches every rubric line.
Have **four browser tabs** open before starting:

| Tab | Login | Used for |
|---|---|---|
| 1 | `alice@example.com` / `password1` | Cook flows (browse, order, profile) |
| 2 | `marco@example.com` / `password1` | Chef flows (royalties, recipe ownership) |
| 3 | `greenfarm@example.com` / `password1` | Supplier flows (inventory, incoming orders) |
| 4 | `admin@example.com` / `password1` | Admin flows (verifications, recipe mgmt, featured) |

Run `MYSQL_PWD=<pwd> ./db/reset.sh` immediately before the demo for clean state.

---

## What's in the seed

| Item | Count | Purpose |
|---|---|---|
| Users | 11 (3 cooks, 3 chefs, 4 suppliers, 1 admin) | role coverage |
| Pending verification | 1 chef + 1 supplier | demo verifications tab |
| Published recipes | 10 (incl. 1 fork) | mix of cook- + chef-published |
| Draft recipe | 1 | shows draft visibility flow |
| Stocks | 22 across 3 suppliers | multi-unit (g/kg/ml/l/piece) for unit demo |
| Low Stock rows | 3 | Bulk Basics Tomato 0.08 kg, Honey 0.05 l, Spice Cinnamon 80 g |
| Orders | 4 in different lifecycle states | placed → in-transit → cancelled-partial → delivered |
| Order_Events | 7 | matches the lifecycle states |
| Reviews | 10 | feeds avg_rating + admin engagement column |
| Recipe_Views | 12 | feeds chef Royalties unique-viewer column |
| Meal lists | 3 | demo Save-to-list flow |
| Active challenges | 2 + 1 ended (with winner) | challenges tab |
| Featured selections | 2 | Home page hero + admin Featured Selections |
| Follows | 7 | profile follower counts |
| Cook log entries | 5 | Profile › Cook Log tab |
| Flavor affinities | 6 (mix of manual + auto) | Flavor Profile tab with "Auto" pill |

---

## Demo sequence

### Act 1 — Browse + search (rubric: Search GUI 10 pts)

1. Open `/` (home) on Alice's tab. Point out:
   - **Featured selections strip** ("Editor's Picks: Italian Week", "Healthy Habits Highlights").
   - **Active challenges** ("Italian Week", "Healthy Habit").
2. Click "Browse Recipes" → `/recipes`.
3. **Search GUI demo:**
   - Type "spag" in the search box → LIKE filter narrows to Spaghetti Pomodoro and Spaghetti Aglio e Olio.
   - Click "Italian" tag chip → filters to Italian-tagged recipes.
   - Set difficulty = Easy → narrows further.
   - Slide cooking time max → range condition.
   - **Mention out loud:** "This hits four condition types in one query: a `LIKE '%spag%'` for the title search, an EXISTS subquery against `Has_Tag` for the tag chip, equality on difficulty, and a `<=` range on cooking_time. The backend builds the WHERE clause dynamically."

### Act 2 — Recipe detail + servings + Shop This Meal (rubric: Application & GUI)

4. Open **Spaghetti Pomodoro**. Point out:
   - Verified Chef badge on Marco's name.
   - Star rating average from `Recipe_Summary` view.
   - Cook log count "X cooked".
5. **Bump servings 2 → 4.** Point out: ingredient quantities AND prices both scale.
6. Click **"Shop This Meal"**. Point out:
   - Each ingredient has a preferred supplier + alternatives.
   - Olive Oil shows two suppliers (Green Farm 0.020/ml vs Spice Supply 0.025/ml) — planner picked the cheaper one.
   - **Mention:** "This is the greedy multi-ingredient consolidation. The planner runs a JOIN across `Stocks`, `Allows_Substitution`, and a taxonomy fallback, then in JS picks the supplier covering the most ingredients first to minimize delivery fees."
7. Click **"Add to Cart"** then go to checkout.

### Act 3 — Multi-step checkout + place order (rubric: Insertion 5 pts, Application & GUI)

8. Walk through Review → Delivery (enter `123 Bilkent Cyberpark`) → Payment.
9. Show the **per-supplier delivery breakdown** in the sidebar: "Delivery · 2 suppliers × $2.49 = $4.98".
10. Click **Complete Order**. Point out toast.
11. **Open Profile › Orders.** Point out:
    - Address line on the order card.
    - Status pill ("Arriving by [date]").
    - Click chevron → expands to show **Timeline** (`Order placed`) + items grouped by supplier.
    - **Mention:** "Order placement is a single transaction — locks the cook's wallet row, locks each supplier's stock row, inserts Orders + Fulfills_Item, debits stock in the supplier's own unit, credits each supplier's wallet, and writes a 'placed' event to Order_Events. Fail anywhere and nothing persists."

### Act 4 — Supplier lifecycle (rubric: Update 5 pts)

12. Switch to **Green Farm tab** → Supplier → Incoming Orders.
13. Find an order, click **"Mark Shipped"**. Point out:
    - Pill flips to "Shipped".
    - **Mention:** "This inserts a 'shipped' event scoped to the supplier into Order_Events. The cook's order detail will pick this up via correlated subqueries that derive 'In transit' state."
14. **Order #3 (Carla's Chickpea Curry)** — already has Spice Supply cancelling. Switch to admin tab and run:
    ```sql
    SELECT * FROM Order_Events WHERE order_id = 3 ORDER BY occurred_at;
    ```
    Or just point at the order in Carla's profile (log in as carla briefly) showing the **red refund banner**: "1 of 3 suppliers cancelled · $X refunded".
15. Switch back to Alice → mark her in-transit order as **Received**.

### Act 5 — Drafts + fork + verified-chef badge (rubric: Application & GUI)

16. **As Bob** (`bob@example.com` / `password1`): go to Profile › My Recipes. Point out the **Draft** pill on "Mystery Recipe (WIP)" and the **fork** "Spaghetti Aglio e Olio" with parent indicator.
17. Click into the draft → owner sees the yellow **"Draft — only you can see this recipe"** banner with a **Publish** button.
18. **Anon path:** open a private window, navigate directly to the draft URL → **404**. Show this proves drafts are owner-only on the backend.

### Act 6 — Admin (rubric: Update 5 pts, Insertion 5 pts, Reports 10 pts)

19. **Admin tab** → Overview. Point out yellow banner "1 chef + 1 supplier verification awaiting". Click **"Review Verifications"**.
20. **Verifications tab** — show `chef_pending`. Click Approve. The pill switches and the row disappears.
    - **Mention:** "Approve flips `Verified_Chef.is_verified = TRUE`. The pending list query is `WHERE is_verified = FALSE`, so they drop out instantly."
21. **User Management tab** — find Bob, click **Manage**. Show:
    - **Promote to chef** → flash to chef tab; switch to Bob's profile, see Verified Chef badge appear.
    - **Reset password** → set `temp123x` → password receipt card appears with copy button. "This is the one window the admin sees the plaintext; backend stored only the hash."
    - **Delete user** (cancel — don't actually delete).
22. **Recipe Management tab.** Point out:
    - Category column populated from `Has_Tag` joined with `Tag` (added via side-query).
    - Engagement column shows clickable likes + comments (Link → recipe page).
    - **Move-to dropdown** → assign a recipe to a featured selection. Mention this is a PATCH that DELETE+INSERTs into `Highlights`.
23. **Featured Selections tab.** Show 2 selections with their recipe chips. Create a third → save → see chips render.
24. **Analytics tab.** Show the activity feed.

### Act 7 — Reports (rubric: 2 reports w/ complex query 10 pts)

25. **Report 1 — Chef Royalties.** Switch to Marco tab → Profile › Royalties tab.
    - **Total Points: 9 · Orders Linked: 2 · Top Recipe: Spaghetti Pomodoro**
    - Per-recipe table: orders, avg rating, unique views.
    - **Show the SQL** (have it ready in your editor):
        ```sql
        SELECT r.recipe_id, r.title,
               COUNT(DISTINCT o.order_id)  AS orders,
               ROUND(AVG(rr.score), 1)     AS avg_rating,
               COUNT(DISTINCT rv.user_id)  AS views
        FROM Recipe r
        LEFT JOIN Orders o            ON r.recipe_id = o.recipe_id
        LEFT JOIN Rates_Review rr     ON r.recipe_id = rr.recipe_id
        LEFT JOIN Recipe_Views rv     ON r.recipe_id = rv.recipe_id
        WHERE r.publisher_chef_id = ?
        GROUP BY r.recipe_id, r.title
        ORDER BY orders DESC, views DESC;
        ```
    - Mention: "Three LEFT JOINs, two `COUNT(DISTINCT)` (so re-views and multi-line orders don't double-count), AVG over reviews, GROUP BY per recipe."

26. **Report 2 — Supplier Dashboard KPIs.** Switch to Green Farm tab → Supplier Dashboard.
    - Show **Wallet Balance, Orders This Week, Low Stock Items, Total Products** KPIs.
    - Open the Low Stock list — see Bulk Basics' Tomato 0.08 kg / Honey 0.05 l / Spice's Cinnamon 80 g.
    - **Show the view + query:**
        ```sql
        -- The view encodes unit-aware thresholds (excerpt)
        CASE
            WHEN s.current_stock = 0 THEN 'Out of Stock'
            WHEN (LOWER(s.unit) = 'g'  AND s.current_stock < 100)
              OR (LOWER(s.unit) = 'kg' AND s.current_stock < 0.1)
              OR (LOWER(s.unit) = 'ml' AND s.current_stock < 100)
              OR (LOWER(s.unit) = 'l'  AND s.current_stock < 0.1)
              OR (LOWER(s.unit) IN ('piece','pieces','pcs') AND s.current_stock < 5)
            THEN 'Low Stock'
            ELSE 'In Stock'
        END AS stock_status

        -- KPI query reads from the view
        SELECT COUNT(*)                                                    AS total_products,
               SUM(stock_status COLLATE utf8mb4_unicode_ci = 'In Stock'
                OR stock_status COLLATE utf8mb4_unicode_ci = 'Low Stock')  AS in_stock_count,
               SUM(stock_status COLLATE utf8mb4_unicode_ci = 'Low Stock')  AS low_stock_count,
               SUM(current_stock * price_per_unit)                          AS inventory_value
        FROM Supplier_Stock_Status WHERE supplier_id = ?;
        ```
    - Mention: "4.85 kg used to be flagged Low Stock the same as 4.85 g — flat threshold. The view normalizes per unit category. Same logic mirrors on the frontend's live-edit badge so it stays consistent."

### Act 8 — Triggers + constraints + integrity (rubric: Database features 10 pts)

Have these snippets ready in your editor — show them as you mention each feature:

```sql
-- Royalty trigger (fires automatically on every order insert)
CREATE TRIGGER trg_update_royalty_on_order
    AFTER INSERT ON Orders
    FOR EACH ROW
BEGIN
    UPDATE Verified_Chef
    SET royalty_points = royalty_points + 1
    WHERE user_id = (SELECT publisher_chef_id FROM Recipe WHERE recipe_id = NEW.recipe_id)
      AND publisher_chef_id IS NOT NULL;
END;

-- Substitution check trigger (CHECK can't reference FK columns in MySQL)
CREATE TRIGGER trg_allows_substitution_check_ins
    BEFORE INSERT ON Allows_Substitution
    FOR EACH ROW
BEGIN
    IF NEW.original_item_id = NEW.substitute_item_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'original_item_id and substitute_item_id must differ';
    END IF;
END;
```

**Mention all three rubric items:**
- **Triggers:** royalty trigger (automatic chef points on orders) + substitution-difference trigger (constraint CHECK can't express).
- **Views:** `Recipe_Summary` (composite metadata + role-following Verified Chef badge via COALESCE), `Supplier_Stock_Status` (unit-aware Low Stock).
- **Constraints / Foreign keys:** every role table FKs to `User`, every recipe-content table FKs to `Recipe` with `ON DELETE CASCADE`. Deleting a User cascades through ~10 tables.

---

## Things to point at when graders ask the obvious questions

### "Show me an example of a DELETE."
Admin → Recipe Management → trash icon next to any user's recipe. Mention `ON DELETE CASCADE` removes Requires, Has_Tag, Allows_Substitution, Recipe_Media, Logs_Cook, Rates_Review, Fulfills_Item rows. Or admin → Manage user → Delete account.

### "How does insertion work?"
- Place an order (Act 3) — that's a multi-row transaction.
- Create a recipe via `/create` — single insert into `Recipe` + N inserts into `Requires` + insert into `Recipe_Media`.

### "How does update work?"
- Edit profile → PATCH `/users/:id`.
- Mark order shipped → INSERT into `Order_Events` (append-only).
- Admin promote → INSERT into `Verified_Chef`. Demote → DELETE from `Verified_Chef` + INSERT IGNORE into `Home_Cook` so the user lands as a cook.

### "Where do you validate input?"
- `backend/src/middleware/validation.js` — auth registration enforces email format + password length.
- `backend/src/routes/orders.js` — required fields (`recipe_id`, `items`, `delivery_address`).
- Frontend toasts via axios interceptor; ConfirmModal on every destructive action.

### "What's user-friendly about it?"
Walk through:
- Servings stepper that scales BOTH quantities and prices in real time.
- Picker shows "Insufficient stock — needs 150 g, only 50 g available" with units.
- ConfirmModal before deletes/cancellations.
- Toast feedback on every API call (success + error).
- Draft banner with one-click Publish.
- Manage user modal shows context-appropriate buttons (no Promote-to-chef for an admin).
- Per-role profile tabs (cooks see Cook Log; suppliers see only header).

---

## Common curveball questions

| Q | Answer |
|---|---|
| "Why no `status` column on Orders?" | Multi-supplier orders make a single status field misleading. We use an event log (`Order_Events`); state is derived. Mirrors how Stripe/Shopify model orders. |
| "Why do chefs hit 500 on flavor profile?" | Intentional. `Has_Affinity` FK is `Home_Cook`-only. Chefs publish; cooks consume the recommendation graph. We hide the tab for chefs in `tabsForRole()` so they don't see a 500. |
| "Why do refunds go to the wallet?" | Demo simplification. There's no real card processor. Refund = wallet credit; cancellation also restores stock in the supplier's own unit via `convert()`. |
| "What's the slowest query?" | The recipe browse page builds dynamic WHERE with multiple subqueries. Mitigated by the `Recipe_Summary` view pre-aggregating ratings, view counts, and thumbnails. |
| "How would you scale this?" | (1) Add indexes on `Order_Events.order_id`, `Recipe_Views (recipe_id, user_id)` — already there. (2) Materialized version of `Recipe_Summary` for >100k recipes. (3) Move the per-supplier wallet credit into a triggered procedure for atomicity guarantees beyond app-level transactions. |

---

## If something goes wrong mid-demo

| Problem | Recovery |
|---|---|
| Backend 500s on a flow you tried | Open new terminal, `tail -20 /tmp/backend.log` — usually a stale browser session. Hit refresh. |
| Cart shows weird totals | localStorage staleness from before reset. Cmd-Shift-Delete → clear site data → log back in. |
| Shop This Meal returns no suppliers for an ingredient | Stock got depleted by earlier demo orders. Run `MYSQL_PWD=<pwd> ./db/reset.sh` between practice runs. |
| Order won't place | Check Alice's wallet — if drained, top-up via Profile or use `payment_method: card` (skips wallet entirely). |
| You forgot a password | Every seeded user is `password1`. If you accidentally changed one, re-run reset. |
