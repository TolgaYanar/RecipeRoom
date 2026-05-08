const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id — public profile
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const [user] = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              CASE
                  WHEN a.user_id IS NOT NULL THEN 'Administrator'
                  WHEN vc.user_id IS NOT NULL THEN 'Verified_Chef'
                  WHEN ls.user_id IS NOT NULL THEN 'Local_Supplier'
                  WHEN hc.user_id IS NOT NULL THEN 'Home_Cook'
              END AS user_type,
              vc.is_verified AS is_verified_chef,
              ls.is_verified AS is_verified_supplier,
              (SELECT COUNT(*) FROM Recipe r
                WHERE r.status = 'published'
                  AND (r.publisher_home_cook_id = u.user_id
                       OR r.publisher_chef_id = u.user_id)) AS recipes_count
       FROM User u
       LEFT JOIN Administrator a ON u.user_id = a.user_id
       LEFT JOIN Verified_Chef vc ON u.user_id = vc.user_id
       LEFT JOIN Local_Supplier ls ON u.user_id = ls.user_id
       LEFT JOIN Home_Cook hc ON u.user_id = hc.user_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id — self only
router.patch('/:id', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required' });
    }

    await query('UPDATE User SET UserName = ? WHERE user_id = ?', [username.trim(), userId]);

    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/recipes — drafts are owner-only.
router.get('/:id/recipes', optionalAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const isOwner = req.user?.id === userId;
    const statusClause = isOwner ? '' : ` AND rs.status = 'published'`;

    // Recipe_Summary carries the thumbnail_url + publisher_name + ratings
    // that RecipeCard needs; raw Recipe rows would render as image-less
    // cards on the profile page.
    const recipes = await query(
      `SELECT rs.*
       FROM Recipe_Summary rs
       JOIN Recipe r ON rs.recipe_id = r.recipe_id
       WHERE (r.publisher_home_cook_id = ? OR r.publisher_chef_id = ?)${statusClause}
       ORDER BY rs.recipe_id DESC`,
      [userId, userId]
    );

    res.json(recipes);
  } catch (err) {
    console.error('Error fetching user recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/royalties — chefs only
router.get('/:id/royalties', requireLogin, requireRole('Verified_Chef'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [chef] = await query(
      'SELECT royalty_points FROM Verified_Chef WHERE user_id = ?',
      [userId]
    );

    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    // Per-recipe performance: orders + average rating + unique viewers.
    const performance = await query(
      `SELECT r.recipe_id, r.title,
              COUNT(DISTINCT o.order_id) AS orders,
              ROUND(AVG(rr.score), 1) AS avg_rating,
              COUNT(DISTINCT rv.user_id) AS views
       FROM Recipe r
       LEFT JOIN Orders o ON r.recipe_id = o.recipe_id
       LEFT JOIN Rates_Review rr ON r.recipe_id = rr.recipe_id
       LEFT JOIN Recipe_Views rv ON r.recipe_id = rv.recipe_id
       WHERE r.publisher_chef_id = ?
       GROUP BY r.recipe_id, r.title
       ORDER BY orders DESC, views DESC, r.recipe_id`,
      [userId]
    );

    const ordersLinked = performance.reduce((s, r) => s + Number(r.orders || 0), 0);
    const topRecipe    = performance.find((r) => Number(r.orders || 0) > 0)?.title ?? '—';

    res.json({
      total_points: chef.royalty_points,
      orders_linked: ordersLinked,
      top_recipe: topRecipe,
      performance,
    });
  } catch (err) {
    console.error('Error fetching user royalties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/meal-lists
// Meal_List PK is (list_name, user_id) — no auto-increment id.
// If ?recipe_id= is provided, each list also carries a contains_recipe
// boolean so the "Save to list" picker can render checkbox state in one
// round-trip.
router.get('/:id/meal-lists', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recipeId = req.query.recipe_id != null ? parseInt(req.query.recipe_id) : null;

    const sql = recipeId
      ? `SELECT ml.list_name, COUNT(cr.recipe_id) AS recipe_count,
                EXISTS (
                  SELECT 1 FROM Contains_Recipe cr2
                  WHERE cr2.list_name = ml.list_name
                    AND cr2.user_id = ml.user_id
                    AND cr2.recipe_id = ?
                ) AS contains_recipe
         FROM Meal_List ml
         LEFT JOIN Contains_Recipe cr ON ml.list_name = cr.list_name AND ml.user_id = cr.user_id
         WHERE ml.user_id = ?
         GROUP BY ml.list_name, ml.user_id
         ORDER BY ml.list_name`
      : `SELECT ml.list_name, COUNT(cr.recipe_id) AS recipe_count
         FROM Meal_List ml
         LEFT JOIN Contains_Recipe cr ON ml.list_name = cr.list_name AND ml.user_id = cr.user_id
         WHERE ml.user_id = ?
         GROUP BY ml.list_name
         ORDER BY ml.list_name`;

    const lists = await query(sql, recipeId ? [recipeId, userId] : [userId]);
    res.json(lists);
  } catch (err) {
    console.error('Error fetching meal lists:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/meal-lists/:listId/recipes — recipes in the list,
// pulled through Recipe_Summary so cards have thumbnails and ratings.
router.get('/:id/meal-lists/:listId/recipes', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const listName = req.params.listId;

    const recipes = await query(
      `SELECT rs.*
       FROM Contains_Recipe cr
       JOIN Recipe_Summary rs ON cr.recipe_id = rs.recipe_id
       WHERE cr.list_name = ? AND cr.user_id = ?
       ORDER BY rs.title`,
      [listName, userId]
    );
    res.json(recipes);
  } catch (err) {
    console.error('Error fetching meal list recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/meal-lists
router.post('/:id/meal-lists', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const listName = name.trim();

    try {
      await query('INSERT INTO Meal_List (list_name, user_id) VALUES (?, ?)', [listName, userId]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'A meal list with that name already exists' });
      }
      throw err;
    }

    res.status(201).json({ list_name: listName, message: 'Meal list created' });
  } catch (err) {
    console.error('Error creating meal list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id/meal-lists/:listId — rename (listId is the list_name)
router.patch('/:id/meal-lists/:listId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const oldName = req.params.listId;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // ON UPDATE CASCADE propagates the new list_name to Contains_Recipe automatically
    const result = await query(
      'UPDATE Meal_List SET list_name = ? WHERE list_name = ? AND user_id = ?',
      [name.trim(), oldName, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meal list not found' });
    }

    res.json({ message: 'Meal list updated' });
  } catch (err) {
    console.error('Error updating meal list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/meal-lists/:listId — listId is the list_name
router.delete('/:id/meal-lists/:listId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const listName = req.params.listId;

    // ON DELETE CASCADE removes Contains_Recipe rows automatically
    const result = await query(
      'DELETE FROM Meal_List WHERE list_name = ? AND user_id = ?',
      [listName, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meal list not found' });
    }

    res.json({ message: 'Meal list deleted' });
  } catch (err) {
    console.error('Error deleting meal list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/meal-lists/:listId/recipes — listId is the list_name
router.post('/:id/meal-lists/:listId/recipes', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const listName = req.params.listId;
    const { recipe_id } = req.body;
    const recipeId = parseInt(recipe_id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Valid recipe_id is required' });
    }

    const [list] = await query(
      'SELECT list_name FROM Meal_List WHERE list_name = ? AND user_id = ?',
      [listName, userId]
    );
    if (!list) {
      return res.status(404).json({ error: 'Meal list not found' });
    }

    const [recipe] = await query('SELECT recipe_id FROM Recipe WHERE recipe_id = ?', [recipeId]);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    try {
      await query(
        'INSERT INTO Contains_Recipe (list_name, user_id, recipe_id) VALUES (?, ?, ?)',
        [listName, userId, recipeId]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Recipe already in list' });
      }
      throw err;
    }

    res.status(201).json({ message: 'Recipe added to list' });
  } catch (err) {
    console.error('Error adding recipe to list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/meal-lists/:listId/recipes/:recipeId — listId is the list_name
router.delete('/:id/meal-lists/:listId/recipes/:recipeId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(userId) || isNaN(recipeId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const listName = req.params.listId;

    const result = await query(
      'DELETE FROM Contains_Recipe WHERE list_name = ? AND user_id = ? AND recipe_id = ?',
      [listName, userId, recipeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recipe not in list' });
    }

    res.json({ message: 'Recipe removed from list' });
  } catch (err) {
    console.error('Error removing recipe from list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use('/:id/flavor-profile', require('./flavorProfile'));
router.use('/:id/cook-log', require('./cookLog'));

// Follow graph — same toggle/check pattern as recipe like/save.
//   POST /users/:id/follow  · current user follows/unfollows :id
//   GET  /users/:id/follow  · returns { following, follower_count, following_count }
//   GET  /users/:id/saved   · current user's saved recipes (only the owner can read)

router.post('/:id/follow', requireLogin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You can't follow yourself" });
  }
  try {
    const existing = await query(
      'SELECT 1 FROM Follows_User WHERE follower_id = ? AND followee_id = ?',
      [req.user.id, targetId]
    );
    if (existing.length > 0) {
      await query(
        'DELETE FROM Follows_User WHERE follower_id = ? AND followee_id = ?',
        [req.user.id, targetId]
      );
    } else {
      await query(
        'INSERT INTO Follows_User (follower_id, followee_id) VALUES (?, ?)',
        [req.user.id, targetId]
      );
    }
    const [{ count }] = await query(
      'SELECT COUNT(*) AS count FROM Follows_User WHERE followee_id = ?',
      [targetId]
    );
    res.json({ following: existing.length === 0, follower_count: count });
  } catch (err) {
    console.error('POST /users/:id/follow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/follow', requireLogin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });
  try {
    const [me] = await query(
      'SELECT 1 AS hit FROM Follows_User WHERE follower_id = ? AND followee_id = ?',
      [req.user.id, targetId]
    );
    const [{ followers }] = await query(
      'SELECT COUNT(*) AS followers FROM Follows_User WHERE followee_id = ?',
      [targetId]
    );
    const [{ following }] = await query(
      'SELECT COUNT(*) AS following FROM Follows_User WHERE follower_id = ?',
      [targetId]
    );
    res.json({
      following: !!me,
      follower_count:  followers,
      following_count: following,
    });
  } catch (err) {
    console.error('GET /users/:id/follow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/saved', requireLogin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId !== req.user.id) {
    return res.status(403).json({ error: 'Saved list is private' });
  }
  try {
    const rows = await query(
      `SELECT r.recipe_id, r.title, r.cooking_time, r.difficulty,
              rm.media_url AS thumbnail_url,
              u.UserName AS publisher_name,
              s.saved_at
       FROM Saves_Recipe s
       JOIN Recipe r  ON s.recipe_id = r.recipe_id
       JOIN User u    ON COALESCE(r.publisher_chef_id, r.publisher_home_cook_id) = u.user_id
       LEFT JOIN Recipe_Media rm ON rm.recipe_id = r.recipe_id AND rm.is_thumbnail = TRUE
       WHERE s.user_id = ?
       ORDER BY s.saved_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users/:id/saved error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/:id/balance — current Home_Cook wallet. Self-only.
// Checkout uses this to surface the real wallet number instead of a placeholder.
router.get('/:id/balance', requireLogin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [row] = await query(
      'SELECT balances FROM Home_Cook WHERE user_id = ?',
      [userId]
    );
    res.json({ balance: row ? Number(row.balances) : 0 });
  } catch (err) {
    console.error('GET /users/:id/balance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/:id/balance/topup — bumps the wallet by { amount }. Self-only.
// No payment processor in scope, so this just credits the row.
router.post('/:id/balance/topup', requireLogin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  // Home_Cook.balances is INT in the schema, so fractional cents would silently
  // round and surprise the user — require whole-dollar amounts up front
  if (!Number.isInteger(amount)) {
    return res.status(400).json({ error: 'amount must be a whole number (no cents)' });
  }
  if (amount > 10000) {
    return res.status(400).json({ error: 'amount exceeds the per-topup cap (10000)' });
  }

  try {
    const result = await query(
      'UPDATE Home_Cook SET balances = balances + ? WHERE user_id = ?',
      [amount, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Home cook profile not found' });
    }
    const [row] = await query(
      'SELECT balances FROM Home_Cook WHERE user_id = ?',
      [userId]
    );
    res.json({ balance: Number(row.balances) });
  } catch (err) {
    console.error('POST /users/:id/balance/topup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
