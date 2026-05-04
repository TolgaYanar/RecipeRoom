const express = require('express');
const { query } = require('../utils/db');

const router = express.Router();

// Search ingredients by name (LIKE autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json([]);

    const results = await query(
      `SELECT ingredient_id, name, generic_taxonomy_name,
              calories_per_unit, protein_g, carbs_g, fat_g
       FROM Ingredient
       WHERE name LIKE ?
       ORDER BY name ASC
       LIMIT 20`,
      [`%${q.trim()}%`]
    );

    res.json(results);
  } catch (err) {
    console.error('GET /ingredients/search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get taxonomy based substitutes for a given ingredient
// Finds other ingredients in the same generic_taxonomy_name group
router.get('/:id/substitutes', async (req, res) => {
  try {
    const ingredientId = parseInt(req.params.id);
    if (isNaN(ingredientId)) return res.status(400).json({ error: 'Invalid ingredient ID' });

    // First find the taxonomy of the requested ingredient
    const [ingredient] = await query(
      'SELECT ingredient_id, name, generic_taxonomy_name FROM Ingredient WHERE ingredient_id = ?',
      [ingredientId]
    );
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });

    // Then find all ingredients in the same taxonomy group (excluding itself)
    const substitutes = await query(
      `SELECT ingredient_id, name, generic_taxonomy_name,
              calories_per_unit, protein_g, carbs_g, fat_g
       FROM Ingredient
       WHERE generic_taxonomy_name = ? AND ingredient_id <> ?
       ORDER BY name ASC`,
      [ingredient.generic_taxonomy_name, ingredientId]
    );

    res.json(substitutes);
  } catch (err) {
    console.error('GET /ingredients/:id/substitutes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;