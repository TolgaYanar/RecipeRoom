-- RecipeRoom demo seed — comprehensive coverage for the CS353 demo.
-- Run via:   MYSQL_PWD=<pwd> ./db/reset.sh   (drops + recreates + reseeds)
-- Every seeded account uses the password "password1" so any grader can
-- log in as any role with one shared bcrypt hash.
--
-- This seed is shaped to demonstrate every rubric line:
--   - Multiple roles in pending and verified states
--   - Multi-unit stocks (g, kg, ml, l, pieces) so unit-aware Low Stock fires
--   - Three suppliers stocking overlapping ingredients so the planner's
--     greedy consolidation has something to consolidate
--   - Recipes published by cooks AND by chefs, including one draft and
--     one fork
--   - Reviews, likes, saves, follows, cook-log entries, recipe views
--   - Orders in every lifecycle state (placed, in-transit, delivered,
--     partially refunded) with matching Order_Events rows
--   - Active challenges + featured selections + meal lists
--   - Mixed manual + auto-inferred flavor profile

SET @SHARED_HASH = '$2b$10$CTyEsznG/ZPOyhyVry7b.OZlghe4Csv8EAzGbBT6YLFM.UgQWWp3a';

-- =============================================
-- 1. TAGS
-- =============================================
INSERT INTO Tag (tag_name, description) VALUES
('Italian',   'Classic Italian cuisine'),
('Healthy',   'Nutritious and balanced recipes'),
('Dessert',   'Sweet treats and desserts'),
('Vegan',     'Plant-based recipes'),
('Quick',     'Ready in under 30 minutes'),
('Comfort',   'Warm and satisfying comfort food'),
('Breakfast', 'Morning meal recipes'),
('Snack',     'Light snack ideas');

-- =============================================
-- 2. BADGES
-- =============================================
INSERT INTO Badge (name, description, icon_url) VALUES
('Master Chef',      'Awarded for completing a cooking challenge',  'https://example.com/icons/master-chef.png'),
('Healthy Eater',    'Earned for cooking nutritious meals consistently', 'https://example.com/icons/healthy-eater.png'),
('Frequent Cooker',  'Awarded for cooking many recipes',           'https://example.com/icons/frequent-cooker.png');

-- =============================================
-- 3. INGREDIENTS (taxonomies enable substitution fallback)
-- =============================================
INSERT INTO Ingredient (name, generic_taxonomy_name, calories_per_unit, protein_g, carbs_g, fat_g) VALUES
('Chicken Breast', 'Poultry',    165, 31, 0, 3.6),
('Spaghetti',      'Pasta',      158, 6, 31, 0.9),
('Tomato',         'Vegetable',   18, 0.9, 3.9, 0.2),
('Basil',          'Herb',        22, 3.2, 2.7, 0.6),
('Olive Oil',      'Oil',        884, 0, 0, 100),
('Garlic',         'Allium',     149, 6.4, 33, 0.5),
('Quinoa',         'Grain',      120, 4.4, 21, 1.9),
('Lemon',          'Citrus',      29, 1.1, 9.3, 0.3),
('Honey',          'Sweetener',  304, 0.3, 82, 0),
('Yogurt',         'Dairy',       59, 10, 3.6, 0.4),
('Banana',         'Fruit',       89, 1.1, 23, 0.3),
('Oats',           'Grain',      389, 16, 66, 6.9),
('Cinnamon',       'Spice',      247, 4, 80, 1.2),
('Apple',          'Fruit',       52, 0.3, 14, 0.2),
('Sugar',          'Sweetener',  387, 0, 100, 0),
('Butter',         'Dairy',      717, 0.9, 0.1, 81),
('Flour',          'Grain',      364, 10, 76, 1),
('Curry Powder',   'Spice',      325, 14, 56, 14),
('Chickpea',       'Legume',     164, 9, 27, 2.6),
('Onion',          'Vegetable',   40, 1.1, 9.3, 0.1),
('Bread',          'Grain',      265, 9, 49, 3.2),
('Strawberry',     'Fruit',       32, 0.7, 7.7, 0.3),
('Lettuce',        'Vegetable',   15, 1.4, 2.9, 0.2),
('Black Pepper',   'Spice',      251, 10, 64, 3.3),
('Pasta',          'Pasta',      158, 6, 31, 0.9);

-- =============================================
-- 4. USERS (every seeded account uses password "password1")
-- =============================================
INSERT INTO User (UserName, Email, passwordHash, join_date) VALUES
('alice_hc',         'alice@example.com',         @SHARED_HASH, NOW()),  -- 1
('bob_hc',           'bob@example.com',           @SHARED_HASH, NOW()),  -- 2
('carla_hc',         'carla@example.com',         @SHARED_HASH, NOW()),  -- 3
('chef_marco',       'marco@example.com',         @SHARED_HASH, NOW()),  -- 4
('chef_aisha',       'aisha@example.com',         @SHARED_HASH, NOW()),  -- 5
('green_farm',       'greenfarm@example.com',     @SHARED_HASH, NOW()),  -- 6
('spice_supply',     'spicesupply@example.com',   @SHARED_HASH, NOW()),  -- 7
('admin_sam',        'admin@example.com',         @SHARED_HASH, NOW()),  -- 8
('bulk_basics',      'bulkbasics@example.com',    @SHARED_HASH, NOW()),  -- 9  bulk supplier (stocks in kg/l for unit demo)
('chef_pending',     'pendingchef@example.com',   @SHARED_HASH, NOW()),  -- 10 awaits admin approval
('supplier_pending', 'pendingsup@example.com',    @SHARED_HASH, NOW());  -- 11 awaits admin approval

-- =============================================
-- 5. ROLE TABLES
-- =============================================
-- Home cooks — alice rich, bob mid, carla low (so wallet top-up demo has a hook)
INSERT INTO Home_Cook (user_id, balances, target_daily_calories, primary_diet_goal) VALUES
(1, 200.00, 2000, 'Maintain'),
(2,  50.00, 2400, 'Bulk'),
(3,   5.00, 1800, 'Lean');

-- Verified chefs — seeded as already verified so they don't sit in the pending queue
INSERT INTO Verified_Chef (user_id, verification_date, royalty_points, is_verified) VALUES
(4,  '2026-01-10', 7, TRUE),
(5,  '2026-02-15', 4, TRUE),
(10, '2026-05-08', 0, FALSE);  -- pending: shows in admin Verifications tab

-- Local suppliers — three of them, varied units. Balances reflect history below.
INSERT INTO Local_Supplier (user_id, business_name, address, contact_number, balance, is_verified) VALUES
(6,  'Green Farm Supplies', '123 Garden Ave',     '+90-555-0101',  92.46, TRUE),
(7,  'Spice Supply Co.',    '45 Market St',       '+90-555-0202',  48.18, TRUE),
(9,  'Bulk Basics',         '88 Wholesale Blvd',  '+90-555-0303',  35.50, TRUE),
(11, 'New Pantry',          '12 Trial St',        '+90-555-0404',   0.00, FALSE);  -- pending

INSERT INTO Administrator (user_id, admin_level) VALUES
(8, 'super');

-- =============================================
-- 6. PREFERENCES + AFFINITY (mixed manual + auto-inferred for the flavor demo)
-- =============================================
INSERT INTO Has_tag_pref (user_id, tag_id) VALUES
(1, 2),  -- alice → Healthy
(1, 5),  -- alice → Quick
(2, 1),  -- bob   → Italian
(3, 4),  -- carla → Vegan
(3, 2);  -- carla → Healthy

-- Manual (is_inferred = FALSE) sit alongside auto-inferred (TRUE) so the
-- "Auto" pill renders next to inferred rows in the flavor profile UI.
INSERT INTO Has_Affinity (user_id, ingredient_id, affinity_score, is_inferred) VALUES
(1, 1, 80, FALSE),  -- alice loves Chicken Breast (manual)
(1, 7, 70, TRUE),   -- alice → Quinoa (auto from cook log)
(1, 3, 65, TRUE),   -- alice → Tomato (auto)
(2, 11, 60, FALSE), -- bob → Banana
(3, 3, 90, FALSE),  -- carla → Tomato
(3, 8, 75, TRUE);   -- carla → Lemon (auto)

-- =============================================
-- 7. RECIPES (10 published + 1 draft + 1 fork — see comments for purpose)
--    Use CURDATE-relative ratings/cook-log so demo dates feel current.
-- =============================================
INSERT INTO Recipe (title, description, cooking_time, difficulty, base_servings, parent_recipe_id, publisher_home_cook_id, publisher_chef_id, status) VALUES
('Spaghetti Pomodoro',         'Classic Italian pasta with fresh tomato sauce',         25, 'Easy',   2, NULL, NULL, 4, 'published'),  -- 1  marco
('Quinoa Power Bowl',          'Healthy bowl with quinoa, vegetables, and lemon dressing', 30, 'Easy',   1, NULL, NULL, 4, 'published'),  -- 2  marco
('Tomato Basil Soup',          'Creamy tomato soup with fresh basil',                   40, 'Medium', 4, NULL, NULL, 4, 'published'),  -- 3  marco
('Vegan Banana Oat Pancakes',  'Fluffy plant-based pancakes',                           20, 'Easy',   2, NULL, NULL, 5, 'published'),  -- 4  aisha
('Chickpea Curry',             'Aromatic chickpea curry with rice',                     45, 'Medium', 4, NULL, NULL, 5, 'published'),  -- 5  aisha
('Apple Crumble',              'Warm apple dessert with crispy oat topping',            60, 'Medium', 6, NULL, 1, NULL, 'published'),  -- 6  alice cook-published
('Bruschetta Trio',            'Three classic Italian bruschetta variations',           20, 'Easy',   4, NULL, NULL, 4, 'published'),  -- 7  marco
('Strawberry Yogurt Smoothie', 'Refreshing breakfast smoothie',                         5,  'Easy',   2, NULL, 1, NULL, 'published'),  -- 8  alice
('Classic Chicken Salad',      'Light salad with grilled chicken and lemon dressing',   25, 'Easy',   2, NULL, 3, NULL, 'published'),  -- 9  carla
('Spaghetti Aglio e Olio',     'Bob''s lighter take on Spaghetti Pomodoro',             20, 'Easy',   2, 1, 2, NULL, 'published'),    -- 10 bob's fork of #1
('Mystery Recipe (WIP)',       'Bob is still tweaking this one',                        15, 'Easy',   2, NULL, 2, NULL, 'draft');       -- 11 bob's draft (only bob sees it)

-- =============================================
-- 8. REQUIRES (recipe ingredients with units — drives planner + scaling)
-- =============================================
INSERT INTO Requires (recipe_id, ingredient_id, quantity, unit) VALUES
-- Spaghetti Pomodoro (5 ingredients, multi-supplier so consolidation is visible)
(1, 2, 150, 'g'),  (1, 3, 200, 'g'),  (1, 4, 10, 'g'),  (1, 5, 15, 'ml'),  (1, 6, 5, 'g'),
-- Quinoa Power Bowl
(2, 7, 100, 'g'),  (2, 3, 80,  'g'),  (2, 8, 1,  'piece'), (2, 5, 10, 'ml'),
-- Tomato Basil Soup
(3, 3, 500, 'g'),  (3, 4, 20, 'g'),   (3, 6, 10, 'g'),     (3, 5, 20, 'ml'),  (3, 20, 1, 'piece'),
-- Vegan Banana Oat Pancakes
(4, 11, 2, 'piece'),(4, 12, 100, 'g'),(4, 13, 2, 'g'),     (4, 9, 15, 'ml'),
-- Chickpea Curry (uses kg-stocked Tomato so unit-conversion shows)
(5, 19, 250, 'g'), (5, 18, 8, 'piece'),(5, 3, 200, 'g'),    (5, 20, 1, 'piece'),(5, 5, 15, 'ml'),
-- Apple Crumble
(6, 14, 4, 'piece'),(6, 17, 150, 'g'),(6, 12, 80, 'g'),    (6, 16, 100, 'g'), (6, 15, 60, 'g'),  (6, 13, 5, 'g'),
-- Bruschetta Trio
(7, 21, 6, 'piece'),(7, 3, 200, 'g'), (7, 4, 8, 'g'),      (7, 5, 30, 'ml'),  (7, 6, 4, 'g'),
-- Strawberry Yogurt Smoothie
(8, 22, 150, 'g'), (8, 10, 200, 'g'),(8, 9, 10, 'ml'),     (8, 11, 1, 'piece'),
-- Classic Chicken Salad
(9, 1, 200, 'g'),  (9, 23, 100, 'g'),(9, 8, 1, 'piece'),   (9, 5, 10, 'ml'),  (9, 24, 2, 'g'),
-- Bob's Aglio e Olio fork (no tomato — that's the twist)
(10, 2, 150, 'g'),  (10, 6, 6, 'g'),   (10, 5, 20, 'ml'),    (10, 24, 2, 'g'),
-- Bob's draft (kept simple)
(11, 17, 200, 'g'), (11, 9, 30, 'ml');

-- =============================================
-- 9. HAS_TAG (recipe categories — drives admin Recipe Management's category column)
-- =============================================
INSERT INTO Has_Tag (recipe_id, tag_id) VALUES
(1,1),(1,5),(1,6),         -- Spaghetti Pomodoro: Italian/Quick/Comfort
(2,2),(2,5),               -- Quinoa Bowl: Healthy/Quick
(3,1),(3,6),               -- Tomato Soup: Italian/Comfort
(4,4),(4,7),(4,5),         -- Vegan Pancakes: Vegan/Breakfast/Quick
(5,2),(5,4),               -- Curry: Healthy/Vegan
(6,3),(6,6),               -- Apple Crumble: Dessert/Comfort
(7,1),(7,8),(7,5),         -- Bruschetta: Italian/Snack/Quick
(8,7),(8,2),(8,5),         -- Smoothie: Breakfast/Healthy/Quick
(9,2),(9,5),               -- Chicken Salad: Healthy/Quick
(10,1),(10,5);             -- Aglio e Olio: Italian/Quick

-- =============================================
-- 10. ALLOWS_SUBSTITUTION (curated recipe-level swaps — picker shows these first)
-- =============================================
INSERT INTO Allows_Substitution (recipe_id, original_item_id, substitute_item_id, quantity_multiplier) VALUES
(1, 2, 25, 1.0),  -- Spaghetti Pomodoro: Spaghetti → Pasta (any pasta)
(1, 4, 13, 0.3), -- Spaghetti Pomodoro: Basil → Cinnamon (just to demo a multiplier)
(4, 11, 14, 1.0), -- Vegan Pancakes: Banana → Apple
(5, 19, 7, 1.5);  -- Curry: Chickpea → Quinoa (more quinoa needed)

-- =============================================
-- 11. RECIPE_MEDIA (thumbnails — drives recipe cards across the app)
-- =============================================
INSERT INTO Recipe_Media (media_url, media_type, is_thumbnail, recipe_id) VALUES
('https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=600&h=450&fit=crop', 'image', TRUE, 1),
('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=450&fit=crop', 'image', TRUE, 2),
('https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=450&fit=crop', 'image', TRUE, 3),
('https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=450&fit=crop', 'image', TRUE, 4),
('https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=450&fit=crop', 'image', TRUE, 5),
('https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=600&h=450&fit=crop', 'image', TRUE, 6),
('https://images.unsplash.com/photo-1572441710094-e0aa7e9f1ba6?w=600&h=450&fit=crop', 'image', TRUE, 7),
('https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&h=450&fit=crop', 'image', TRUE, 8),
('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=450&fit=crop', 'image', TRUE, 9),
('https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=450&fit=crop', 'image', TRUE, 10);

-- =============================================
-- 12. STOCKS (multi-unit, overlapping — drives unit-aware Low Stock + planner consolidation)
-- =============================================
-- Green Farm: produce in g + ml (ample stock for ordering during demo)
INSERT INTO Stocks (supplier_id, ingredient_id, price_per_unit, current_stock, unit) VALUES
(6, 2,  0.018, 1000, 'g'),     -- Spaghetti
(6, 3,  0.005, 1500, 'g'),     -- Tomato
(6, 4,  0.080,  600, 'g'),     -- Basil
(6, 7,  0.012, 1200, 'g'),     -- Quinoa
(6, 14, 0.4,    300, 'piece'), -- Apple
(6, 11, 0.3,     50, 'piece'), -- Banana (well-stocked; threshold is < 5 piece)
(6, 22, 0.020,  500, 'g'),     -- Strawberry
(6, 5,  0.020,  900, 'ml');    -- Olive Oil

-- Spice Supply: spices in g + a piece-priced item (Curry Powder)
INSERT INTO Stocks (supplier_id, ingredient_id, price_per_unit, current_stock, unit) VALUES
(7, 6,   0.050,  300, 'g'),     -- Garlic
(7, 13,  0.070,   80, 'g'),     -- Cinnamon — close to Low Stock
(7, 18,  0.30,    40, 'piece'), -- Curry Powder
(7, 24,  0.080,  200, 'g'),     -- Black Pepper
(7, 5,   0.025,  400, 'ml');    -- Olive Oil (overlap with Green Farm — planner picks cheaper)

-- Bulk Basics: kg/l units to demo unit conversion + Low Stock thresholds
INSERT INTO Stocks (supplier_id, ingredient_id, price_per_unit, current_stock, unit) VALUES
(9, 2,   16.0,   3.5, 'kg'),    -- Spaghetti — in kg, comfortable stock
(9, 3,   4.0,    0.08, 'kg'),   -- Tomato — Low Stock! (< 0.1 kg threshold)
(9, 17,  1.5,    25,  'kg'),    -- Flour
(9, 16,  6.0,    8,   'kg'),    -- Butter
(9, 12,  3.0,    12,  'kg'),    -- Oats
(9, 5,   18.0,   5,   'l'),     -- Olive Oil — l unit
(9, 9,   12.0,   0.05, 'l'),    -- Honey — Low Stock! (< 0.1 l)
(9, 19,  4.0,    20,  'kg'),    -- Chickpea
(9, 1,   18.0,   15,  'kg');    -- Chicken Breast

-- =============================================
-- 13. SAVED RECIPES + LIKES (drives engagement counts)
-- =============================================
INSERT INTO Saves_Recipe (user_id, recipe_id) VALUES
(1, 4), (1, 7),                  -- alice saves vegan pancakes, bruschetta
(2, 1), (2, 3), (2, 7),          -- bob saves italian classics
(3, 2), (3, 4), (3, 5);          -- carla saves healthy/vegan

INSERT INTO Likes_Recipe (user_id, recipe_id) VALUES
(1, 1), (1, 3), (1, 7), (1, 4),
(2, 1), (2, 7), (2, 6),
(3, 2), (3, 4), (3, 5), (3, 8),
(4, 5),                          -- chef likes another chef's recipe
(5, 1), (5, 7);

-- =============================================
-- 14. RATINGS + REVIEWS (drives avg_rating + review_count + admin engagement column)
--     Spread across recipes; some star-only, some with comments.
-- =============================================
INSERT INTO Rates_Review (recipe_id, user_id, score, review_text, timestamp) VALUES
(1, 1, 5, 'Perfect simple pasta with bright tomato flavor.', NOW() - INTERVAL 8 DAY),
(1, 2, 5, 'Made it twice this week. So good.',               NOW() - INTERVAL 4 DAY),
(1, 3, 4, 'Loved it but added more garlic.',                  NOW() - INTERVAL 1 DAY),
(2, 1, 4, 'Light and filling.',                               NOW() - INTERVAL 6 DAY),
(2, 3, 5, NULL,                                                NOW() - INTERVAL 2 DAY),
(3, 2, 5, 'Comfort food at its finest.',                      NOW() - INTERVAL 9 DAY),
(4, 1, 4, 'Fluffy and not too sweet.',                        NOW() - INTERVAL 3 DAY),
(5, 3, 5, 'Best curry I have made at home.',                  NOW() - INTERVAL 5 DAY),
(7, 2, 4, NULL,                                                NOW() - INTERVAL 7 DAY),
(8, 3, 4, 'Quick weekday breakfast win.',                     NOW() - INTERVAL 2 DAY);

INSERT INTO Likes_Review (recipe_id, review_user_id, review_timestamp, liker_user_id) VALUES
(1, 1, NOW() - INTERVAL 8 DAY, 2),
(1, 1, NOW() - INTERVAL 8 DAY, 3),
(3, 2, NOW() - INTERVAL 9 DAY, 1);

-- =============================================
-- 15. COOK LOG (alice + carla actively cook; drives Cook Log tab)
-- =============================================
INSERT INTO Logs_Cook (recipe_id, user_id, date_cook, scaled_serving) VALUES
(1, 1, CURDATE() - INTERVAL 6 DAY, 2),
(2, 1, CURDATE() - INTERVAL 4 DAY, 1),
(7, 1, CURDATE() - INTERVAL 1 DAY, 4),
(4, 3, CURDATE() - INTERVAL 5 DAY, 2),
(5, 3, CURDATE() - INTERVAL 2 DAY, 4);

-- =============================================
-- 16. MEAL LISTS (alice has curated lists; drives Meal Lists tab)
-- =============================================
INSERT INTO Meal_List (list_name, user_id) VALUES
('Weeknight Dinners', 1),
('Weekend Brunch',    1),
('Bob''s Italian',    2);

INSERT INTO Contains_Recipe (list_name, user_id, recipe_id) VALUES
('Weeknight Dinners', 1, 1),
('Weeknight Dinners', 1, 2),
('Weeknight Dinners', 1, 9),
('Weekend Brunch',    1, 4),
('Weekend Brunch',    1, 8),
('Bob''s Italian',    2, 1),
('Bob''s Italian',    2, 3),
('Bob''s Italian',    2, 7);

-- =============================================
-- 17. KITCHEN CHALLENGES + PARTICIPATION
-- =============================================
INSERT INTO Kitchen_Challenge (title, description, start_date, end_date, required_tag_id, user_id) VALUES
('Italian Week',     'Cook 3 Italian recipes in one week',
   CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, 1, 8),
('Healthy Habit',    'Cook 5 healthy recipes this month',
   CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 20 DAY, 2, 8),
('Vegan Adventure',  'Try 3 vegan recipes in two weeks',
   CURDATE() - INTERVAL 14 DAY, CURDATE() - INTERVAL 1 DAY, 4, 8);  -- ended (winner-pickable)

-- Alice is intentionally NOT pre-joined to Italian Week — the demo (Act 8)
-- has her click "Join" live to show the Participates_in INSERT + scoring flow.
INSERT INTO Participates_in (user_id, challenge_id, score, progress_status) VALUES
(2, 1, 1, 'In Progress'),  -- bob in Italian Week, 1 italian cook
(3, 2, 3, 'In Progress'),  -- carla doing healthy
(3, 3, 3, 'Winner');       -- carla won the ended vegan challenge

-- Each challenge offers a badge as the prize via the Offers table.
INSERT INTO Offers (challenge_id, badge_id) VALUES
(1, 1),  -- Italian Week    → Master Chef
(2, 2),  -- Healthy Habit   → Healthy Eater
(3, 3);  -- Vegan Adventure → Frequent Cooker

INSERT INTO Unlocks (user_id, badge_id) VALUES
(3, 3);  -- carla unlocked Frequent Cooker by winning Vegan Adventure

-- =============================================
-- 18. FOLLOWERS (chef has followers; drives Profile follower count)
-- =============================================
INSERT INTO Follows_User (follower_id, followee_id) VALUES
(1, 4),  -- alice follows marco
(2, 4),  -- bob follows marco
(3, 4),  -- carla follows marco
(1, 5),  -- alice follows aisha
(3, 5),
(4, 5),  -- chef follows chef
(2, 1);  -- bob follows alice

-- =============================================
-- 19. FEATURED SELECTIONS + HIGHLIGHTS (Home page hero strip)
-- =============================================
INSERT INTO Featured_Selection (selection_type, start_date, end_date, curator_id) VALUES
('Editor''s Picks: Italian Week', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, 8),
('Healthy Habits Highlights',     CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 6 DAY, 8);

INSERT INTO Highlights (selection_id, recipe_id) VALUES
(1, 1), (1, 3), (1, 7), (1, 10),  -- italian set
(2, 2), (2, 5), (2, 9);            -- healthy set

-- =============================================
-- 20. RECIPE_VIEWS (drives chef Royalties unique-viewer column)
--     A handful of users viewed Marco's hits multiple times.
-- =============================================
INSERT INTO Recipe_Views (recipe_id, user_id, first_viewed_at, last_viewed_at, view_count) VALUES
(1, 1, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 1 DAY, 5),
(1, 2, NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 2 DAY, 3),
(1, 3, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY, 1),
(2, 1, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY, 2),
(2, 3, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, 1),
(3, 1, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY, 1),
(3, 2, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 1 DAY, 4),
(7, 2, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY, 2),
(4, 1, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY, 1),
(4, 3, NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 2 DAY, 3),
(5, 1, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, 1),
(5, 2, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, 1);

-- =============================================
-- 21. ORDERS (four orders, every lifecycle state visible)
-- =============================================
-- 1. alice ordered 8 days ago → time-derived "Delivered N days ago"
INSERT INTO Orders (order_date, total_price, creator_id, recipe_id, scaled_serving, delivery_address, delivery_notes) VALUES
(NOW() - INTERVAL 8 DAY, 4.10, 1, 1, 2, '123 Bilkent Cyberpark, Ankara', 'Leave at door'),
-- 2. bob 2 days ago, supplier shipped, awaits cook receipt → "In transit"
(NOW() - INTERVAL 2 DAY, 5.40, 2, 3, 4, '45 Cankaya Ave, Ankara', NULL),
-- 3. carla 1 day ago, one supplier cancelled → red refund banner
(NOW() - INTERVAL 1 DAY, 3.85, 3, 5, 4, '8 Tunalı Hilmi, Ankara', 'Ring twice'),
-- 4. alice today, fresh placement → "Arriving by ..."
(NOW() - INTERVAL 1 HOUR, 2.30, 1, 8, 2, '123 Bilkent Cyberpark, Ankara', NULL);

-- =============================================
-- 22. FULFILLS_ITEM
-- =============================================
INSERT INTO Fulfills_Item (order_id, ingredient_id, supplier_id, purchased_quantity, subtotal) VALUES
-- order 1: alice, Spaghetti Pomodoro x 2 servings → mostly Green Farm + Spice for garlic + olive oil
(1, 2, 6, 150, 2.70),  (1, 3, 6, 200, 1.00),  (1, 4, 6, 10, 0.80),  (1, 5, 7, 15, 0.38),  (1, 6, 7, 5, 0.25),
-- order 2: bob, Tomato Basil Soup x 4 servings (scale 2x) → Green Farm + Spice
(2, 3, 6, 1000, 5.00),  (2, 4, 6, 40, 3.20),  (2, 6, 7, 20, 1.00),  (2, 5, 7, 40, 1.00),
-- order 3: carla, Chickpea Curry x 4 servings → Bulk Basics (chickpea+oil) + Spice (curry powder) + Green Farm (tomato)
(3, 19, 9, 250, 1.00), (3, 18, 7, 8, 2.40), (3, 3, 6, 200, 1.00), (3, 5, 9, 15, 0.27),
-- order 4: alice, Smoothie → Green Farm + Bulk Basics
(4, 22, 6, 150, 3.00), (4, 10, 9, 200, 0.50), (4, 9, 9, 10, 0.12), (4, 11, 6, 1, 0.30);

-- =============================================
-- 23. ORDER_EVENTS (matches the lifecycle states above)
-- =============================================
INSERT INTO Order_Events (order_id, supplier_id, event_type, actor_user_id, notes, occurred_at) VALUES
-- order 1: full lifecycle — placed → both suppliers shipped → cook received → cook reviewed
(1, NULL, 'placed',    1, NULL, NOW() - INTERVAL 8 DAY),
(1, 6,    'shipped',   6, NULL, NOW() - INTERVAL 7 DAY - INTERVAL 12 HOUR),
(1, 7,    'shipped',   7, NULL, NOW() - INTERVAL 7 DAY - INTERVAL 6 HOUR),
(1, NULL, 'delivered', 1, NULL, NOW() - INTERVAL 5 DAY),
(1, NULL, 'reviewed',  1, NULL, NOW() - INTERVAL 4 DAY),
-- order 2: placed → both suppliers shipped → cook hasn't received yet (in transit)
(2, NULL, 'placed',  2, NULL, NOW() - INTERVAL 2 DAY),
(2, 6,    'shipped', 6, NULL, NOW() - INTERVAL 36 HOUR),
(2, 7,    'shipped', 7, NULL, NOW() - INTERVAL 30 HOUR),
-- order 3: placed → Spice cancelled their slice (refund banner shown to cook)
(3, NULL, 'placed',    3, NULL, NOW() - INTERVAL 1 DAY),
(3, 7,    'cancelled', 7, NULL, NOW() - INTERVAL 18 HOUR),
-- order 4: just placed (arriving by [+3d])
(4, NULL, 'placed', 1, NULL, NOW() - INTERVAL 1 HOUR);
