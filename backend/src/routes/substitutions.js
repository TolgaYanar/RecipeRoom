const express = require('express');
const { query } = require('../utils/db');

const router = express.Router();

// POST /api/substitutions/plan
// Returns per-ingredient supplier options and allowed substitutes for a recipe
// Used by the "Shop This Meal" feature on RecipeDetail page
router.post('/plan', async (req, res) => {
  try {
    const { recipe_id } = req.body;
    const recipeId = parseInt(recipe_id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Valid recipe_id is required' });

    const [recipe] = await query(
      'SELECT recipe_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Get all ingredients required for this recipe
    const ingredients = await query(
      `SELECT req.ingredient_id, req.quantity AS base_quantity, req.unit,
              i.name, i.generic_taxonomy_name
       FROM Requires req
       JOIN Ingredient i ON req.ingredient_id = i.ingredient_id
       WHERE req.recipe_id = ?`,
      [recipeId]
    );

    const plan = [];

    for (const ing of ingredients) {
      // Find cheapest available supplier directly from Stocks table
      const suppliers = await query(
        `SELECT s.supplier_id, ls.business_name AS supplier_name,
                s.price_per_unit, s.current_stock, s.unit
         FROM Stocks s
         JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
         WHERE s.ingredient_id = ? AND s.current_stock > 0
         ORDER BY s.price_per_unit ASC
         LIMIT 1`,
        [ing.ingredient_id]
      );

      const preferred = suppliers[0] || null;

      // Check recipe-specific allowed substitutes first
      const recipeSubstitutes = await query(
        `SELECT asub.substitute_item_id AS ingredient_id,
                i_sub.name,
                asub.quantity_multiplier,
                s.supplier_id, ls.business_name AS supplier_name,
                s.price_per_unit, s.current_stock
         FROM Allows_Substitution asub
         JOIN Ingredient i_sub ON asub.substitute_item_id = i_sub.ingredient_id
         JOIN Stocks s ON asub.substitute_item_id = s.ingredient_id
         JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
         WHERE asub.recipe_id = ?
           AND asub.original_item_id = ?
           AND s.current_stock > 0
         ORDER BY s.price_per_unit ASC`,
        [recipeId, ing.ingredient_id]
      );

      // Fall back to taxonomy-based substitutes if no recipe-specific ones found
      let alternatives = recipeSubstitutes;
      if (alternatives.length === 0) {
        alternatives = await query(
          `SELECT i.ingredient_id, i.name, 1.0 AS quantity_multiplier,
                  s.supplier_id, ls.business_name AS supplier_name,
                  s.price_per_unit, s.current_stock
           FROM Ingredient i
           JOIN Stocks s ON i.ingredient_id = s.ingredient_id
           JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
           WHERE i.generic_taxonomy_name = ?
             AND i.ingredient_id <> ?
             AND s.current_stock > 0
           ORDER BY s.price_per_unit ASC
           LIMIT 3`,
          [ing.generic_taxonomy_name, ing.ingredient_id]
        );
      }

      plan.push({
        ingredient_id:      ing.ingredient_id,
        ingredient_name:    ing.name,
        base_quantity:      ing.base_quantity,
        unit:               ing.unit,
        in_stock:           preferred !== null,
        preferred_supplier: preferred,
        alternatives,
      });
    }

    res.json(plan);
  } catch (err) {
    console.error('POST /substitutions/plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;