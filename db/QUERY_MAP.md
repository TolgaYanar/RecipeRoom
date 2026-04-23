# D03 — Query Map

Every frontend API call → endpoint → core SQL.
Views: `Recipe_Summary`, `Supplier_Stock_Status`.
Trigger: `trg_update_royalty_on_order` fires on `Orders.status → 'Completed'`.

---

## Auth

| Endpoint | SQL |
|---|---|
| POST /auth/login | `SELECT ... FROM User LEFT JOIN Home_Cook/Verified_Chef/Local_Supplier/Administrator WHERE Email = ?` |
| POST /auth/register/home-cook | `INSERT INTO User ...; INSERT INTO Home_Cook ...` |
| POST /auth/register/chef | `INSERT INTO User ...; INSERT INTO Verified_Chef ...` |
| POST /auth/register/supplier | `INSERT INTO User ...; INSERT INTO Local_Supplier ...` |
| POST /auth/register/admin | `INSERT INTO User ...; INSERT INTO Administrator ...` |
| GET /auth/me | `SELECT u.*, user_type FROM User LEFT JOIN subtypes WHERE user_id = ?` |

---

## Recipes

| Endpoint | SQL |
|---|---|
| GET /recipes | `SELECT * FROM Recipe_Summary WHERE title LIKE ? AND difficulty = ? AND cooking_time <= ? ORDER BY avg_rating DESC LIMIT ? OFFSET ?` |
| GET /recipes/:id | `SELECT * FROM Recipe_Summary WHERE recipe_id = ?` + `SELECT * FROM Requires JOIN Ingredient` + `SELECT * FROM Has_Tag JOIN Tag` |
| POST /recipes | `INSERT INTO Recipe ...; INSERT INTO Requires ...; INSERT INTO Has_Tag ...` |
| PUT /recipes/:id | `UPDATE Recipe ...; DELETE/re-INSERT Requires, Has_Tag` |
| DELETE /recipes/:id | `DELETE FROM Recipe WHERE recipe_id = ?` (cascades) |
| POST /recipes/:id/fork | `INSERT INTO Recipe (parent_recipe_id = ?) ...; INSERT INTO Requires (copied)` |
| POST /recipes/:id/publish | `UPDATE Recipe SET is_published = TRUE WHERE recipe_id = ?` |
| GET /recipes/my | `SELECT * FROM Recipe_Summary WHERE publisher_home_cook_id = ? OR publisher_chef_id = ?` |
| GET /recipes/:id/performance | `SELECT COUNT(*) FROM Logs_Cook WHERE recipe_id = ?` + `SELECT royalty_points FROM Verified_Chef` |
| GET /recipes/:id/media | `SELECT * FROM Recipe_Media WHERE recipe_id = ?` |
| POST /recipes/:id/media | `INSERT INTO Recipe_Media ...` |
| PATCH /recipes/:id/media/:id | `UPDATE Recipe_Media ...` |
| DELETE /recipes/:id/media/:id | `DELETE FROM Recipe_Media WHERE media_url = ? AND recipe_id = ?` |
| GET /recipes/:id/substitutions | `SELECT * FROM Allows_Substitution JOIN Ingredient (x2) WHERE recipe_id = ?` |
| POST /recipes/:id/substitutions | `INSERT INTO Allows_Substitution ...` |
| DELETE /recipes/:id/substitutions/:id | `DELETE FROM Allows_Substitution WHERE recipe_id = ? AND original_item_id = ? AND substitute_item_id = ?` |

---

## Ingredients

| Endpoint | SQL |
|---|---|
| GET /ingredients/search?q= | `SELECT * FROM Ingredient WHERE name LIKE '%?%' LIMIT 20` |
| GET /ingredients/:id/substitutes | `SELECT i2.* FROM Ingredient i1 JOIN Ingredient i2 ON i1.generic_taxonomy_name = i2.generic_taxonomy_name WHERE i1.ingredient_id = ?` |

---

## Substitutions (Shop This Meal)

| Endpoint | SQL |
|---|---|
| POST /substitutions/plan | `SELECT * FROM Supplier_Stock_Status WHERE ingredient_id = ? AND stock_status <> 'Out of Stock' ORDER BY price_per_unit ASC LIMIT 1` — falls back to taxonomy substitutes if no result |

---

## Orders

| Endpoint | SQL |
|---|---|
| POST /orders | `INSERT INTO Orders ...; INSERT INTO Fulfills_Item (per line item)` |
| GET /orders/mine | `SELECT o.*, r.title FROM Orders o JOIN Recipe r WHERE creator_id = ? ORDER BY order_date DESC` |
| GET /orders/supplier | `SELECT o.*, fi.* FROM Fulfills_Item fi JOIN Orders o WHERE fi.supplier_id = ?` |
| PATCH /orders/:id/status | `UPDATE Orders SET status = ? WHERE order_id = ?` (triggers royalty update) |
| GET /orders/:id | `SELECT * FROM Orders JOIN Recipe WHERE order_id = ?` + `SELECT * FROM Fulfills_Item JOIN Ingredient JOIN Local_Supplier` |

---

## Suppliers

| Endpoint | SQL |
|---|---|
| GET /suppliers/:id/inventory | `SELECT * FROM Supplier_Stock_Status WHERE supplier_id = ?` |
| POST /suppliers/inventory | `INSERT INTO Stocks ...` |
| PATCH /suppliers/inventory/:id | `UPDATE Stocks SET price_per_unit = ?, current_stock = ? WHERE supplier_id = ? AND ingredient_id = ?` |
| DELETE /suppliers/inventory/:id | `DELETE FROM Stocks WHERE supplier_id = ? AND ingredient_id = ?` |
| GET /suppliers/stock-status | `SELECT * FROM Supplier_Stock_Status` |

---

## Challenges

| Endpoint | SQL |
|---|---|
| GET /challenges | `SELECT kc.*, t.tag_name, b.name, COUNT(pi.user_id) FROM Kitchen_Challenge kc JOIN Tag JOIN Offers JOIN Badge LEFT JOIN Participates_in GROUP BY kc.challenge_id` |
| GET /challenges/:id | same as above for one + leaderboard: `SELECT u.UserName, COUNT(lc.recipe_id) FROM Participates_in JOIN User LEFT JOIN Logs_Cook WHERE challenge_id = ? ORDER BY count DESC` |
| POST /challenges | `INSERT INTO Kitchen_Challenge ...` |
| POST /challenges/:id/entries | `INSERT INTO Participates_in (user_id, challenge_id, 'In Progress') ON DUPLICATE KEY UPDATE` |
| POST /challenges/:id/winner | `UPDATE Participates_in SET status='Winner'; INSERT INTO Unlocks SELECT badge_id FROM Offers WHERE challenge_id = ?` |
| PATCH /challenges/:id | `UPDATE Kitchen_Challenge ...` |

---

## Users

| Endpoint | SQL |
|---|---|
| GET /users/:id | `SELECT u.*, subtype fields FROM User LEFT JOIN subtypes WHERE user_id = ?` |
| PATCH /users/:id | `UPDATE User ...; UPDATE Home_Cook SET diet_goal = ? ...` |
| GET /users/:id/recipes | `SELECT * FROM Recipe_Summary WHERE publisher_home_cook_id = ? OR publisher_chef_id = ?` |
| GET /users/:id/royalties | `SELECT vc.royalty_points, COUNT(o.order_id), SUM(o.total_price) FROM Verified_Chef LEFT JOIN Recipe LEFT JOIN Orders WHERE status='Completed'` |
| GET /users/:id/meal-lists | `SELECT ml.list_name, COUNT(cr.recipe_id) FROM Meal_List ml LEFT JOIN Contains_Recipe WHERE user_id = ?` |
| POST /users/:id/meal-lists | `INSERT INTO Meal_List (list_name, user_id)` |
| PATCH /users/:id/meal-lists/:id | rename: re-insert with new name, update Contains_Recipe, delete old |
| DELETE /users/:id/meal-lists/:id | `DELETE FROM Meal_List WHERE list_name = ? AND user_id = ?` |
| POST /users/:id/meal-lists/:id/recipes | `INSERT INTO Contains_Recipe ...` |
| DELETE /users/:id/meal-lists/:id/recipes/:id | `DELETE FROM Contains_Recipe WHERE list_name=? AND user_id=? AND recipe_id=?` |

---

## Reviews

| Endpoint | SQL |
|---|---|
| GET /reviews/recipe/:id | `SELECT rr.*, u.UserName FROM Rates_Review rr JOIN User u WHERE recipe_id = ? ORDER BY timestamp DESC` |
| POST /reviews/recipe/:id | `INSERT INTO Rates_Review (recipe_id, user_id, score, review_text, NOW())` |
| DELETE /reviews/:id | `DELETE FROM Rates_Review WHERE recipe_id = ? AND user_id = ?` |

---

## Highlights

| Endpoint | SQL |
|---|---|
| GET /highlights/home | Featured: `SELECT * FROM Featured_Selection JOIN Highlights JOIN Recipe_Summary WHERE NOW() BETWEEN start_date AND end_date`; Trending: `SELECT rs.*, COUNT(*) FROM Logs_Cook JOIN Recipe_Summary WHERE date_cook >= 30 days ago GROUP BY recipe_id ORDER BY count DESC LIMIT 8`; Active challenges: `SELECT * FROM Kitchen_Challenge WHERE CURDATE() BETWEEN start_date AND end_date` |

---

## Admin

| Endpoint | SQL |
|---|---|
| GET /admin/pending-chefs | `SELECT u.*, vc.* FROM Verified_Chef vc JOIN User u WHERE not yet approved` |
| POST /admin/chefs/:id/approve | `UPDATE Verified_Chef SET verification_date = CURDATE()` |
| POST /admin/chefs/:id/reject | `DELETE FROM Verified_Chef; DELETE FROM User WHERE user_id = ?` |
| GET /admin/ingredients | `SELECT * FROM Ingredient ORDER BY name` |
| POST /admin/ingredients | `INSERT INTO Ingredient ...` |
| PATCH /admin/ingredients/:id | `UPDATE Ingredient ... WHERE ingredient_id = ?` |
| DELETE /admin/ingredients/:id | `DELETE FROM Ingredient WHERE ingredient_id = ?` |
| POST /admin/content/:type/:id/moderate | `INSERT INTO Moderates ...; DELETE FROM Recipe if action='remove'` |
| GET /admin/highlights | `SELECT fs.*, COUNT(h.recipe_id) FROM Featured_Selection fs LEFT JOIN Highlights GROUP BY selection_id` |
| POST /admin/highlights | `INSERT INTO Featured_Selection ...` |
| PATCH /admin/highlights/:id | `UPDATE Featured_Selection ...` |
| DELETE /admin/highlights/:id | `DELETE FROM Featured_Selection WHERE selection_id = ?` |

---

## Cook Log

| Endpoint | SQL |
|---|---|
| POST /users/:id/cook-log | `INSERT INTO Logs_Cook (recipe_id, user_id, CURDATE(), scaled_serving) ON DUPLICATE KEY UPDATE scaled_serving = ?` |
| GET /users/:id/cook-log | `SELECT lc.*, rs.title, rs.thumbnail_url FROM Logs_Cook lc JOIN Recipe_Summary rs WHERE user_id = ? ORDER BY date_cook DESC LIMIT ? OFFSET ?` |
| DELETE /users/:id/cook-log/:id | `DELETE FROM Logs_Cook WHERE recipe_id = ? AND user_id = ?` |

---

## Flavor Profile

| Endpoint | SQL |
|---|---|
| GET /users/:id/flavor-profile | `SELECT ha.*, i.name FROM Has_Affinity ha JOIN Ingredient i WHERE user_id = ? ORDER BY affinity_score DESC` |
| PUT /users/:id/flavor-profile | `INSERT INTO Has_Affinity ... ON DUPLICATE KEY UPDATE affinity_score = ?, is_inferred = FALSE` |
| POST /users/:id/flavor-profile/infer | `INSERT INTO Has_Affinity SELECT user_id, ingredient_id, COUNT(*) FROM Logs_Cook JOIN Requires WHERE user_id = ? GROUP BY ingredient_id ON DUPLICATE KEY UPDATE affinity_score = COUNT(*)` |
| GET /users/:id/recommendations | `SELECT rs.*, SUM(ha.affinity_score) AS score FROM Recipe_Summary rs JOIN Requires JOIN Has_Affinity WHERE user_id = ? AND recipe not already cooked GROUP BY recipe_id ORDER BY score DESC LIMIT 12` |

---

## Table Coverage

Every table has at least one read and one write path above.

| Table | Read | Write |
|---|---|---|
| User | GET /auth/me | POST /auth/register/* |
| Home_Cook | GET /auth/me | POST /auth/register/home-cook |
| Verified_Chef | GET /users/:id/royalties | POST /auth/register/chef |
| Local_Supplier | GET /suppliers/:id/inventory | POST /auth/register/supplier |
| Administrator | GET /admin/pending-chefs | POST /auth/register/admin |
| Recipe | GET /recipes | POST /recipes |
| Recipe_Media | GET /recipes/:id/media | POST /recipes/:id/media |
| Has_Tag | GET /recipes/:id | POST /recipes |
| Tag | GET /challenges | POST /challenges |
| Requires | GET /recipes/:id | POST /recipes |
| Allows_Substitution | GET /recipes/:id/substitutions | POST /recipes/:id/substitutions |
| Contains_Recipe | GET /users/:id/meal-lists | POST /users/:id/meal-lists/:id/recipes |
| Meal_List | GET /users/:id/meal-lists | POST /users/:id/meal-lists |
| Kitchen_Challenge | GET /challenges | POST /challenges |
| Participates_in | GET /challenges/:id | POST /challenges/:id/entries |
| Badge | GET /challenges | (seeded) |
| Offers | GET /challenges | POST /challenges |
| Unlocks | GET /challenges/:id | POST /challenges/:id/winner |
| Ingredient | GET /ingredients/search | POST /admin/ingredients |
| Stocks | GET /suppliers/:id/inventory | POST /suppliers/inventory |
| Featured_Selection | GET /highlights/home | POST /admin/highlights |
| Highlights | GET /highlights/home | POST /admin/highlights |
| Orders | GET /orders/mine | POST /orders |
| Fulfills_Item | GET /orders/:id | POST /orders |
| Logs_Cook | GET /users/:id/cook-log | POST /users/:id/cook-log |
| Rates_Review | GET /reviews/recipe/:id | POST /reviews/recipe/:id |
| Has_Affinity | GET /users/:id/flavor-profile | PUT /users/:id/flavor-profile |
| Has_tag_pref | (profile settings) | (profile settings) |
| Moderates | (admin panel) | POST /admin/content/:type/:id/moderate |
