const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');

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
              END AS user_type
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

// GET /api/users/:id/recipes
router.get('/:id/recipes', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const recipes = await query(
      `SELECT recipe_id, title, description, cooking_time, difficulty, base_servings, parent_recipe_id
       FROM Recipe
       WHERE publisher_home_cook_id = ? OR publisher_chef_id = ?
       ORDER BY recipe_id DESC`,
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

    // Per-recipe breakdown: completed orders for this chef's recipes
    const perRecipe = await query(
      `SELECT r.recipe_id, r.title, COUNT(o.order_id) AS completed_orders
       FROM Recipe r
       LEFT JOIN Orders o ON r.recipe_id = o.recipe_id AND o.status = 'Completed'
       WHERE r.publisher_chef_id = ?
       GROUP BY r.recipe_id, r.title
       ORDER BY completed_orders DESC`,
      [userId]
    );

    res.json({
      total_points: chef.royalty_points,
      per_recipe: perRecipe,
    });
  } catch (err) {
    console.error('Error fetching user royalties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/meal-lists
// Meal_List PK is (list_name, user_id) — no auto-increment id
router.get('/:id/meal-lists', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const lists = await query(
      `SELECT ml.list_name, COUNT(cr.recipe_id) AS recipe_count
       FROM Meal_List ml
       LEFT JOIN Contains_Recipe cr ON ml.list_name = cr.list_name AND ml.user_id = cr.user_id
       WHERE ml.user_id = ?
       GROUP BY ml.list_name
       ORDER BY ml.list_name`,
      [userId]
    );

    res.json(lists);
  } catch (err) {
    console.error('Error fetching meal lists:', err);
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

module.exports = router;
