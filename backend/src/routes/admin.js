const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require Administrator role
router.use(requireRole('Administrator'));

// GET /api/admin/pending-chefs — chefs with verification_status = 'PENDING'
router.get('/pending-chefs', async (req, res) => {
  try {
    const pendingChefs = await query(
      'SELECT id, username, email, join_date FROM User WHERE user_type = "Chef" AND verification_status = "PENDING" ORDER BY join_date ASC'
    );

    res.json(pendingChefs);
  } catch (err) {
    console.error('Error fetching pending chefs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/approve
router.post('/chefs/:id/approve', async (req, res) => {
  try {
    const chefId = parseInt(req.params.id);
    if (isNaN(chefId)) {
      return res.status(400).json({ error: 'Invalid chef ID' });
    }

    const result = await query(
      'UPDATE User SET verification_status = "VERIFIED" WHERE id = ? AND user_type = "Chef" AND verification_status = "PENDING"',
      [chefId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending chef not found' });
    }

    res.json({ message: 'Chef approved successfully' });
  } catch (err) {
    console.error('Error approving chef:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/reject
router.post('/chefs/:id/reject', async (req, res) => {
  try {
    const chefId = parseInt(req.params.id);
    if (isNaN(chefId)) {
      return res.status(400).json({ error: 'Invalid chef ID' });
    }

    const result = await query(
      'UPDATE User SET verification_status = "REJECTED" WHERE id = ? AND user_type = "Chef" AND verification_status = "PENDING"',
      [chefId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending chef not found' });
    }

    res.json({ message: 'Chef rejected successfully' });
  } catch (err) {
    console.error('Error rejecting chef:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/ingredients — list
router.get('/ingredients', async (req, res) => {
  try {
    const ingredients = await query(
      'SELECT id, name, description FROM Ingredient ORDER BY name ASC'
    );

    res.json(ingredients);
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/ingredients — create
router.post('/ingredients', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      'INSERT INTO Ingredient (name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Ingredient created' });
  } catch (err) {
    console.error('Error creating ingredient:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ingredient name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PATCH /api/admin/ingredients/:id — update
router.patch('/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = parseInt(req.params.id);
    if (isNaN(ingredientId)) {
      return res.status(400).json({ error: 'Invalid ingredient ID' });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      'UPDATE Ingredient SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description || null, ingredientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ message: 'Ingredient updated' });
  } catch (err) {
    console.error('Error updating ingredient:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ingredient name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/admin/ingredients/:id
router.delete('/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = parseInt(req.params.id);
    if (isNaN(ingredientId)) {
      return res.status(400).json({ error: 'Invalid ingredient ID' });
    }

    // Check if ingredient is used in recipes
    const [usage] = await query(
      'SELECT COUNT(*) as count FROM Recipe_Ingredient WHERE ingredient_id = ?',
      [ingredientId]
    );

    if (usage.count > 0) {
      return res.status(409).json({ error: 'Cannot delete ingredient used in recipes' });
    }

    const result = await query('DELETE FROM Ingredient WHERE id = ?', [ingredientId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ message: 'Ingredient deleted' });
  } catch (err) {
    console.error('Error deleting ingredient:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/content/:type/:id/moderate — flag/remove recipe or review
router.post('/content/:type/:id/moderate', async (req, res) => {
  try {
    const { type, id } = req.params;
    const contentId = parseInt(id);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: 'Invalid content ID' });
    }

    if (type === 'recipe') {
      const result = await query(
        'UPDATE Recipe SET status = "removed" WHERE id = ?',
        [contentId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json({ message: 'Recipe removed' });
    } else if (type === 'review') {
      const result = await query('DELETE FROM Review WHERE id = ?', [contentId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json({ message: 'Review deleted' });
    } else {
      return res.status(400).json({ error: 'Invalid content type. Must be "recipe" or "review"' });
    }
  } catch (err) {
    console.error('Error moderating content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;