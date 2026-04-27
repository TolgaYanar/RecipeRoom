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
      'SELECT id, username, email, user_type, join_date FROM User WHERE id = ?',
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

    await query('UPDATE User SET username = ? WHERE id = ?', [username.trim(), userId]);

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
      'SELECT id, title, description, prep_time, cook_time, servings, difficulty, status, created_at FROM Recipe WHERE author_id = ? AND status = "published" ORDER BY created_at DESC',
      [userId]
    );

    res.json(recipes);
  } catch (err) {
    console.error('Error fetching user recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/royalties — chefs only
router.get('/:id/royalties', requireLogin, requireRole('Chef'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const royalties = await query(
      'SELECT recipe_id, royalty_points, earned_at FROM Earns_Royalty WHERE user_id = ? ORDER BY earned_at DESC',
      [userId]
    );

    const [total] = await query(
      'SELECT SUM(royalty_points) as total_points FROM Earns_Royalty WHERE user_id = ?',
      [userId]
    );

    res.json({
      royalties,
      total_points: total.total_points || 0
    });
  } catch (err) {
    console.error('Error fetching user royalties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/meal-lists
router.get('/:id/meal-lists', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const lists = await query(
      'SELECT ml.id, ml.name, ml.description, ml.created_at, COUNT(cr.recipe_id) as recipe_count FROM Meal_List ml LEFT JOIN Contains_Recipe cr ON ml.id = cr.list_id WHERE ml.user_id = ? GROUP BY ml.id ORDER BY ml.created_at DESC',
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

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      'INSERT INTO Meal_List (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name.trim(), description || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Meal list created' });
  } catch (err) {
    console.error('Error creating meal list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id/meal-lists/:listId
router.patch('/:id/meal-lists/:listId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const listId = parseInt(req.params.listId);
    if (isNaN(userId) || isNaN(listId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      'UPDATE Meal_List SET name = ?, description = ? WHERE id = ? AND user_id = ?',
      [name.trim(), description || null, listId, userId]
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

// DELETE /api/users/:id/meal-lists/:listId
router.delete('/:id/meal-lists/:listId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const listId = parseInt(req.params.listId);
    if (isNaN(userId) || isNaN(listId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await withTransaction(async (connection) => {
      await connection.query('DELETE FROM Contains_Recipe WHERE list_id = ?', [listId]);
      const result = await connection.query('DELETE FROM Meal_List WHERE id = ? AND user_id = ?', [listId, userId]);
      if (result.affectedRows === 0) {
        throw new Error('Meal list not found');
      }
    });

    res.json({ message: 'Meal list deleted' });
  } catch (err) {
    console.error('Error deleting meal list:', err);
    if (err.message === 'Meal list not found') {
      res.status(404).json({ error: 'Meal list not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/users/:id/meal-lists/:listId/recipes
router.post('/:id/meal-lists/:listId/recipes', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const listId = parseInt(req.params.listId);
    if (isNaN(userId) || isNaN(listId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { recipe_id } = req.body;
    const recipeId = parseInt(recipe_id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Valid recipe_id is required' });
    }

    // Check if list belongs to user
    const [list] = await query('SELECT id FROM Meal_List WHERE id = ? AND user_id = ?', [listId, userId]);
    if (!list) {
      return res.status(404).json({ error: 'Meal list not found' });
    }

    // Check if recipe exists
    const [recipe] = await query('SELECT id FROM Recipe WHERE id = ? AND status = "published"', [recipeId]);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check for duplicate
    const [existing] = await query('SELECT id FROM Contains_Recipe WHERE list_id = ? AND recipe_id = ?', [listId, recipeId]);
    if (existing) {
      return res.status(409).json({ error: 'Recipe already in list' });
    }

    await query('INSERT INTO Contains_Recipe (list_id, recipe_id) VALUES (?, ?)', [listId, recipeId]);

    res.status(201).json({ message: 'Recipe added to list' });
  } catch (err) {
    console.error('Error adding recipe to list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/meal-lists/:listId/recipes/:recipeId
router.delete('/:id/meal-lists/:listId/recipes/:recipeId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const listId = parseInt(req.params.listId);
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(userId) || isNaN(listId) || isNaN(recipeId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'DELETE FROM Contains_Recipe WHERE list_id = ? AND recipe_id = ? AND list_id IN (SELECT id FROM Meal_List WHERE user_id = ?)',
      [listId, recipeId, userId]
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

module.exports = router;