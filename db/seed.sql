-- RecipeRoom demo seed data
-- Run after db/init.sql on a fresh reciperoom schema.

-- Tags
INSERT INTO Tag (tag_name, description) VALUES
('Italian', 'Classic Italian cuisine'),
('Healthy', 'Nutritious and balanced recipes'),
('Dessert', 'Sweet treats and desserts'),
('Vegan', 'Plant-based recipes'),
('Quick', 'Ready in under 30 minutes'),
('Comfort', 'Warm and satisfying comfort food'),
('Breakfast', 'Morning meal recipes'),
('Snack', 'Light snack ideas');

-- Ingredients
INSERT INTO Ingredient (name, generic_taxonomy_name, calories_per_unit, protein_g, carbs_g, fat_g) VALUES
('Chicken Breast', 'Poultry', 165, 31, 0, 3.6),
('Spaghetti', 'Pasta', 158, 6, 31, 0.9),
('Tomato', 'Vegetable', 18, 0.9, 3.9, 0.2),
('Basil', 'Herb', 22, 3.2, 2.7, 0.6),
('Olive Oil', 'Oil', 119, 0, 0, 13.5),
('Garlic', 'Allium', 4, 0.2, 1, 0),
('Quinoa', 'Grain', 120, 4.4, 21.3, 1.9),
('Spinach', 'Leafy Green', 23, 2.9, 3.6, 0.4),
('Banana', 'Fruit', 89, 1.1, 23, 0.3),
('Oats', 'Grain', 389, 16.9, 66.3, 6.9),
('Apple', 'Fruit', 52, 0.3, 14, 0.2),
('Sugar', 'Sweetener', 387, 0, 100, 0),
('Flour', 'Grain', 364, 10, 76, 1),
('Egg', 'Poultry Product', 155, 13, 1.1, 11),
('Milk', 'Dairy', 42, 3.4, 5, 1),
('Shrimp', 'Seafood', 99, 24, 0.2, 0.3),
('Chickpeas', 'Legume', 164, 8.9, 27.4, 2.6),
('Curry Powder', 'Spice', 325, 14.1, 58.1, 13.9),
('Avocado', 'Fruit', 160, 2, 9, 15),
('Yogurt', 'Dairy', 59, 10, 3.6, 0.4);

-- Badges
INSERT INTO Badge (name, description, icon_url) VALUES
('Master Chef', 'Awarded for completing a cooking challenge', 'https://example.com/icons/master-chef.png'),
('Healthy Eater', 'Earned for cooking nutritious meals consistently', 'https://example.com/icons/healthy-eater.png'),
('Frequent Cooker', 'Awarded for cooking many recipes', 'https://example.com/icons/frequent-cooker.png');

-- Users
INSERT INTO User (UserName, Email, passwordHash, join_date) VALUES
('alice_hc', 'alice@example.com', '$2b$10$CTyEsznG/ZPOyhyVry7b.OZlghe4Csv8EAzGbBT6YLFM.UgQWWp3a', NOW()),
('bob_hc', 'bob@example.com', '$2b$10$zoqzZS.oVnRdRoaGpY.nL..yERSIGz0M7Ad6oQaXssy8XlnDsuCVi', NOW()),
('carla_hc', 'carla@example.com', '$2b$10$KDpqsFAARshJKUEgr.QJYOLGbBvGHqX/GZGWhoohSqDOze2AkHAEq', NOW()),
('chef_marco', 'marco@example.com', '$2b$10$puAY1VqPhz9eRzei9JxYWe/zFAW6MI9GEG.cy2Qq7lo0aP2yxweOW', NOW()),
('chef_aisha', 'aisha@example.com', '$2b$10$ql7C7khBHtyMakGxJJpYw.S0GhWwTcRZIu1.2By.A4TlIRCC..Pc.', NOW()),
('green_farm', 'greenfarm@example.com', '$2b$10$cLBM18uzp5L8Eh9zXJb2UOC7dO.As8XCJYTvmD2hg9YXvrafgHw/O', NOW()),
('spice_supply', 'spicesupply@example.com', '$2b$10$7CdLJ1.RanAaMPxBXh5jOeCBc14Cd2KTgPl9bAhHmmN02IKmKXhPq', NOW()),
('admin_sam', 'admin@example.com', '$2b$10$spGfhwzOr2om5KBcUcuBb.RQp04iO.JlJ1J6lxcm8Io8tSeNdogFW', NOW());

-- User subtypes
INSERT INTO Home_Cook (user_id, balances, target_daily_calories, primary_diet_goal) VALUES
(1, 120, 2200, 'Weight maintenance'),
(2, 80, 1800, 'Energy boost'),
(3, 200, 2000, 'Balanced diet');

INSERT INTO Verified_Chef (user_id, verification_date, royalty_points) VALUES
(4, '2026-01-10', 0),
(5, '2026-02-15', 0);

INSERT INTO Local_Supplier (user_id, business_name, address, contact_number) VALUES
(6, 'Green Farm Supplies', '123 Garden Ave', '+90-555-0101'),
(7, 'Spice Supply Co.', '45 Market St', '+90-555-0202');

INSERT INTO Administrator (user_id, admin_level) VALUES
(8, 'super');

-- Home cook preferences and affinity
INSERT INTO Has_tag_pref (tag_id, user_id) VALUES
(2, 1),
(5, 1),
(2, 2),
(8, 3);

INSERT INTO Has_Affinity (user_id, ingredient_id, affinity_score, is_inferred) VALUES
(1, 1, 80, FALSE),
(1, 7, 70, TRUE),
(2, 11, 60, FALSE),
(3, 3, 90, FALSE),
(3, 8, 75, TRUE);

-- Meal lists
INSERT INTO Meal_List (list_name, user_id) VALUES
('Weekend Favorites', 1),
('Quick Dinners', 2),
('Comfort Classics', 3);

-- Recipes
INSERT INTO Recipe (title, description, cooking_time, difficulty, base_servings, publisher_chef_id, publisher_home_cook_id) VALUES
('Spaghetti Pomodoro', 'Fresh tomato sauce with basil and olive oil over spaghetti.', 25, 'Easy', 2, 4, NULL),
('Quinoa Power Bowl', 'A protein-rich quinoa bowl with spinach, chickpeas, and avocado.', 30, 'Medium', 2, 5, NULL),
('Tomato Basil Soup', 'Creamy tomato soup with fresh basil and garlic.', 40, 'Easy', 4, 4, NULL),
('Vegan Banana Oat Pancakes', 'Fluffy vegan pancakes made with banana and oat milk.', 20, 'Easy', 2, 5, NULL),
('Sea Garlic Shrimp', 'Sautéed shrimp with garlic, olive oil, and lemon.', 18, 'Easy', 2, NULL, 3),
('Apple Crumble', 'Warm apple crumble with cinnamon and oat topping.', 50, 'Medium', 6, NULL, 1),
('Bruschetta Trio', 'Toasted bread topped with tomatoes, basil, and olive oil.', 15, 'Easy', 4, NULL, 2),
('Chickpea Curry', 'Hearty chickpea curry with warming spices and spinach.', 35, 'Medium', 4, 4, NULL),
('Classic Chicken Salad', 'Grilled chicken breast salad with greens and a light dressing.', 25, 'Easy', 2, NULL, 2),
('Strawberry Yogurt Smoothie', 'Creamy smoothie made with yogurt, banana, and berries.', 10, 'Easy', 1, 5, NULL);

-- Recipe media
INSERT INTO Recipe_Media (media_url, media_type, is_thumbnail, recipe_id) VALUES
('https://example.com/images/spaghetti.jpg', 'image', TRUE, 1),
('https://example.com/images/quinoa-bowl.jpg', 'image', TRUE, 2),
('https://example.com/images/tomato-soup.jpg', 'image', TRUE, 3),
('https://example.com/images/banana-pancakes.jpg', 'image', TRUE, 4),
('https://example.com/images/shrimp.jpg', 'image', TRUE, 5),
('https://example.com/images/apple-crumble.jpg', 'image', TRUE, 6),
('https://example.com/images/bruschetta.jpg', 'image', TRUE, 7),
('https://example.com/images/chickpea-curry.jpg', 'image', TRUE, 8),
('https://example.com/images/chicken-salad.jpg', 'image', TRUE, 9),
('https://example.com/images/smoothie.jpg', 'image', TRUE, 10);

-- Recipe tags
INSERT INTO Has_Tag (recipe_id, tag_id) VALUES
(1, 1), (1, 5), (1, 6),
(2, 2), (2, 5),
(3, 1), (3, 2),
(4, 4), (4, 7),
(5, 5), (5, 6),
(6, 3), (6, 6),
(7, 1), (7, 8),
(8, 2), (8, 4),
(9, 2), (9, 5),
(10, 7), (10, 2);

-- Recipe requirements
INSERT INTO Requires (ingredient_id, recipe_id, quantity, unit) VALUES
(2, 1, 150, 'g'),
(3, 1, 200, 'g'),
(4, 1, 10, 'g'),
(5, 1, 15, 'ml'),
(6, 1, 5, 'g'),
(7, 2, 100, 'g'),
(8, 2, 50, 'g'),
(16, 2, 120, 'g'),
(19, 2, 50, 'g'),
(3, 3, 250, 'g'),
(4, 3, 8, 'g'),
(6, 3, 5, 'g'),
(3, 4, 120, 'g'),
(9, 4, 1, 'piece'),
(10, 4, 80, 'g'),
(15, 4, 150, 'ml'),
(16, 5, 200, 'g'),
(6, 5, 4, 'g'),
(5, 5, 10, 'ml'),
(11, 6, 3, 'pieces'),
(12, 6, 50, 'g'),
(10, 6, 60, 'g'),
(13, 6, 120, 'g'),
(3, 7, 120, 'g'),
(4, 7, 5, 'g'),
(5, 7, 15, 'ml'),
(17, 8, 200, 'g'),
(8, 8, 40, 'g'),
(18, 8, 1, 'piece'),
(1, 9, 150, 'g'),
(8, 9, 40, 'g'),
(14, 9, 1, 'piece'),
(9, 10, 1, 'piece'),
(15, 10, 120, 'ml'),
(18, 10, 10, 'g');

-- Allows substitutions
INSERT INTO Allows_Substitution (recipe_id, original_item_id, substitute_item_id, quantity_multiplier) VALUES
(1, 5, 18, 1.0),
(2, 8, 20, 1.0),
(4, 10, 9, 1.0),
(5, 16, 1, 1.0),
(6, 12, 13, 1.0);

-- Featured selection and highlights
INSERT INTO Featured_Selection (selection_type, start_date, end_date, curator_id) VALUES
('Editor Picks', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), 8);

INSERT INTO Highlights (selection_id, recipe_id) VALUES
(1, 1),
(1, 2),
(1, 4);

-- Kitchen challenges
INSERT INTO Kitchen_Challenge (title, description, start_date, end_date, required_tag_id, user_id) VALUES
('Healthy Week', 'Create a healthy recipe that uses leafy greens.', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 2, 8),
('Comfort Classics', 'Cook a comforting meal with a satisfying flavor profile.', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 6, 8);

INSERT INTO Participates_in (user_id, challenge_id, progress_status) VALUES
(1, 1, 'In Progress'),
(2, 1, 'In Progress'),
(3, 2, 'Completed');

INSERT INTO Offers (badge_id, challenge_id) VALUES
(2, 1),
(1, 2);

INSERT INTO Unlocks (user_id, badge_id) VALUES
(3, 1);

-- Supplier inventory
INSERT INTO Stocks (supplier_id, ingredient_id, price_per_unit, current_stock, unit) VALUES
(6, 2, 1.8, 200, 'g'),
(6, 3, 0.6, 500, 'g'),
(6, 7, 2.0, 100, 'g'),
(7, 5, 0.15, 300, 'ml'),
(7, 6, 0.05, 100, 'g'),
(7, 18, 0.30, 40, 'piece');

-- Completed orders and supplier fulfillments
INSERT INTO Orders (order_date, total_price, creator_id, recipe_id, scaled_serving, status) VALUES
('2026-04-10 12:30:00', 24.50, 1, 1, 2, 'Completed'),
('2026-04-12 18:45:00', 18.75, 2, 2, 1.5, 'Completed'),
('2026-04-15 20:00:00', 3.90, 3, 10, 1, 'Completed');

INSERT INTO Fulfills_Item (order_id, ingredient_id, supplier_id, purchased_quantity, subtotal) VALUES
(1, 2, 6, 300, 5.40),
(1, 3, 6, 200, 1.20),
(2, 7, 6, 150, 3.00),
(3, 10, 7, 80, 1.60);

-- Logs and reviews
INSERT INTO Logs_Cook (recipe_id, user_id, date_cook, scaled_serving) VALUES
(1, 1, '2026-04-11', 2),
(3, 3, '2026-04-05', 4),
(10, 2, '2026-04-14', 1);

INSERT INTO Rates_Review (recipe_id, user_id, score, review_text, timestamp) VALUES
(1, 1, 5, 'Perfect simple pasta with bright tomato flavor.', '2026-04-11 14:00:00'),
(2, 2, 4, 'Great nutty bowl with balanced textures.', '2026-04-12 19:00:00'),
(10, 3, 5, 'Refreshing and easy to drink.', '2026-04-15 21:00:00');
