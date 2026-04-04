-- RecipeRoom Database Schema
-- CS353 - Group 7
-- Run: mysql -u root -p reciperoom < db/init.sql

-- =============================================
-- BASE TABLES (no foreign key dependencies)
-- =============================================

CREATE TABLE User(
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    UserName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    join_date DATETIME NOT NULL
);

CREATE TABLE Tag(
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    tag_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE Ingredient(
    ingredient_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    generic_taxonomy_name VARCHAR(255) NOT NULL,
    calories_per_unit INT,
    protein_g DOUBLE CHECK (protein_g >= 0),
    carbs_g DOUBLE CHECK (carbs_g >= 0),
    fat_g DOUBLE CHECK (fat_g >= 0)
);

CREATE TABLE Badge(
    badge_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(255) NOT NULL UNIQUE
);

-- =============================================
-- USER SUBTYPES
-- =============================================

CREATE TABLE Home_Cook(
    user_id INT PRIMARY KEY,
    balances INT NOT NULL DEFAULT 0,
    target_daily_calories INT,
    primary_diet_goal VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Verified_Chef(
    user_id INT PRIMARY KEY,
    verification_date DATE NOT NULL,
    royalty_points INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Local_Supplier(
    user_id INT PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL UNIQUE,
    contact_number VARCHAR(255) NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Administrator(
    user_id INT PRIMARY KEY,
    admin_level VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- TABLES DEPENDING ON USER SUBTYPES
-- =============================================

CREATE TABLE Meal_List(
    list_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (list_name, user_id),
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Has_tag_pref(
    tag_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (tag_id, user_id),
    FOREIGN KEY (tag_id) REFERENCES Tag(tag_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Kitchen_Challenge(
    challenge_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    required_tag_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (required_tag_id) REFERENCES Tag(tag_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Administrator(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Participates_in(
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    progress_status VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES Kitchen_Challenge(challenge_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Offers(
    badge_id INT NOT NULL,
    challenge_id INT NOT NULL,
    PRIMARY KEY (badge_id, challenge_id),
    FOREIGN KEY (badge_id) REFERENCES Badge(badge_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES Kitchen_Challenge(challenge_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Unlocks(
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES Badge(badge_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Has_Affinity(
    user_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    affinity_score INT NOT NULL,
    is_inferred BOOLEAN NOT NULL,
    PRIMARY KEY (user_id, ingredient_id),
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Featured_Selection(
    selection_id INT PRIMARY KEY AUTO_INCREMENT,
    selection_type VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    curator_id INT,
    FOREIGN KEY (curator_id) REFERENCES Administrator(user_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE Stocks(
    supplier_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    price_per_unit DOUBLE NOT NULL CHECK (price_per_unit > 0),
    current_stock DOUBLE NOT NULL CHECK (current_stock >= 0),
    unit VARCHAR(20),
    PRIMARY KEY (supplier_id, ingredient_id),
    FOREIGN KEY (supplier_id) REFERENCES Local_Supplier(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- RECIPE AND RELATED TABLES
-- =============================================

CREATE TABLE Recipe(
    recipe_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cooking_time INT NOT NULL,
    difficulty VARCHAR(255),
    base_servings INT NOT NULL,
    parent_recipe_id INT,
    publisher_home_cook_id INT,
    publisher_chef_id INT,
    -- NOTE: owner constraint (exactly one publisher) enforced at application level
    -- MySQL does not allow CHECK on columns used in FK referential actions
    FOREIGN KEY (parent_recipe_id) REFERENCES Recipe(recipe_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (publisher_chef_id) REFERENCES Verified_Chef(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (publisher_home_cook_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Recipe_Media(
    media_url VARCHAR(255) NOT NULL,
    media_type VARCHAR(255),
    is_thumbnail BOOLEAN,
    recipe_id INT NOT NULL,
    PRIMARY KEY (media_url, recipe_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Has_Tag(
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tag(tag_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Requires(
    ingredient_id INT NOT NULL,
    recipe_id INT NOT NULL,
    quantity DOUBLE NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id),
    FOREIGN KEY (ingredient_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Allows_Substitution(
    recipe_id INT NOT NULL,
    original_item_id INT NOT NULL,
    substitute_item_id INT NOT NULL,
    quantity_multiplier DOUBLE NOT NULL CHECK (quantity_multiplier > 0),
    PRIMARY KEY (recipe_id, original_item_id, substitute_item_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (original_item_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (substitute_item_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE
    -- NOTE: is_ingrd_different constraint (original != substitute) enforced at application level
    -- MySQL does not allow CHECK on columns used in FK referential actions
);

CREATE TABLE Contains_Recipe(
    list_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    PRIMARY KEY (list_name, user_id, recipe_id),
    FOREIGN KEY (list_name, user_id) REFERENCES Meal_List(list_name, user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Highlights(
    selection_id INT NOT NULL,
    recipe_id INT NOT NULL,
    PRIMARY KEY (selection_id, recipe_id),
    FOREIGN KEY (selection_id) REFERENCES Featured_Selection(selection_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Moderates(
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    moderation_date DATETIME NOT NULL,
    PRIMARY KEY (recipe_id, user_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Administrator(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Logs_Cook(
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    date_cook DATE NOT NULL,
    scaled_serving DOUBLE NOT NULL CHECK (scaled_serving > 0),
    PRIMARY KEY (recipe_id, user_id, date_cook),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Rates_Review(
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    score INT NOT NULL,
    review_text TEXT,
    timestamp DATETIME NOT NULL,
    PRIMARY KEY (recipe_id, user_id, timestamp),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- ORDER TABLES
-- =============================================

CREATE TABLE Orders(
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_date DATETIME NOT NULL,
    total_price DOUBLE NOT NULL CHECK (total_price > 0),
    creator_id INT NOT NULL,
    recipe_id INT NOT NULL,
    scaled_serving DOUBLE NOT NULL CHECK (scaled_serving > 0),
    status VARCHAR(255) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES Home_Cook(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Fulfills_Item(
    order_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    supplier_id INT NOT NULL,
    purchased_quantity DOUBLE NOT NULL CHECK (purchased_quantity > 0),
    subtotal DOUBLE NOT NULL CHECK (subtotal > 0),
    PRIMARY KEY (order_id, ingredient_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES Local_Supplier(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- VIEWS
-- =============================================

CREATE VIEW Recipe_Summary AS
SELECT r.recipe_id, r.title, r.description, r.cooking_time, r.difficulty, r.base_servings,
       u.UserName AS publisher_name,
       vc.user_id AS is_verified_chef,
       AVG(rr.score) AS avg_rating,
       COUNT(DISTINCT rr.user_id) AS review_count,
       COUNT(DISTINCT lc.user_id) AS cook_log_count,
       rm.media_url AS thumbnail_url
FROM Recipe r
JOIN User u ON (
    (r.publisher_home_cook_id IS NOT NULL AND r.publisher_home_cook_id = u.user_id)
    OR (r.publisher_chef_id IS NOT NULL AND r.publisher_chef_id = u.user_id)
)
LEFT JOIN Verified_Chef vc ON r.publisher_chef_id = vc.user_id
LEFT JOIN Rates_Review rr ON r.recipe_id = rr.recipe_id
LEFT JOIN Logs_Cook lc ON r.recipe_id = lc.recipe_id
LEFT JOIN Recipe_Media rm ON r.recipe_id = rm.recipe_id AND rm.is_thumbnail = TRUE
GROUP BY r.recipe_id, r.title, r.description, r.cooking_time, r.difficulty,
         r.base_servings, u.UserName, vc.user_id, rm.media_url;

CREATE VIEW Supplier_Stock_Status AS
SELECT ls.user_id AS supplier_id, ls.business_name,
       i.ingredient_id, i.name AS ingredient_name, i.generic_taxonomy_name,
       s.current_stock, s.price_per_unit, s.unit,
       CASE
           WHEN s.current_stock = 0 THEN 'Out of Stock'
           WHEN s.current_stock < 30 THEN 'Low Stock'
           ELSE 'In Stock'
       END AS stock_status
FROM Stocks s
JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
JOIN Ingredient i ON s.ingredient_id = i.ingredient_id;

-- =============================================
-- TRIGGERS
-- =============================================

DELIMITER //
CREATE TRIGGER trg_update_royalty_on_order
    AFTER UPDATE ON Orders
    FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        UPDATE Verified_Chef
        SET royalty_points = royalty_points + 1
        WHERE user_id = (
            SELECT publisher_chef_id FROM Recipe
            WHERE recipe_id = NEW.recipe_id AND publisher_chef_id IS NOT NULL
        );
    END IF;
END//
DELIMITER ;
