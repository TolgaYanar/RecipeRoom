const express = require('express');
const { query } = require('../utils/db');
const { hasEnough, convert, compatible } = require('../utils/units');

const router = express.Router();

// Returns per-ingredient supplier options + substitute ingredients for a recipe.
//
// Body shape:
//   {
//     recipe_id: 5,
//     ingredients: [
//       { ingredient_id, name, quantity, requested_quantity, unit }
//     ]
//   }
//
// `requested_quantity` is the servings-scaled amount the buyer will actually
// order; `unit` is the recipe's unit. Stock comes back in the supplier's own
// unit and the planner converts where it can (g↔kg, ml↔l, pieces) so 5 kg
// available correctly covers a 150 g request.
//
// Preferred supplier per ingredient is chosen by a greedy multi-ingredient
// pass that consolidates suppliers across the whole recipe — picking one
// supplier that covers many ingredients beats picking the per-ingredient
// cheapest, since the cook pays a per-supplier delivery fee on top.
router.post('/plan', async (req, res) => {
  try {
    const { recipe_id, ingredients: reqIngredients } = req.body;
    const recipeId = parseInt(recipe_id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Valid recipe_id is required' });

    const [recipe] = await query(
      'SELECT recipe_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const requestedMap = new Map();
    if (Array.isArray(reqIngredients)) {
      for (const ri of reqIngredients) {
        const id = Number(ri.ingredient_id);
        const want = Number(ri.requested_quantity ?? ri.quantity);
        if (Number.isFinite(id) && Number.isFinite(want)) requestedMap.set(id, want);
      }
    }

    const ingredients = await query(
      `SELECT req.ingredient_id, req.quantity AS base_quantity, req.unit,
              i.name, i.generic_taxonomy_name
       FROM Requires req
       JOIN Ingredient i ON req.ingredient_id = i.ingredient_id
       WHERE req.recipe_id = ?`,
      [recipeId]
    );

    // Per-ingredient candidate lists: same-ingredient suppliers + substitutes.
    // Same-ingredient candidates are eligible for cross-ingredient consolidation;
    // substitutes are user-only choices since they change the dish.
    const sameIngByIng = new Map();
    const substitutesByIng = new Map();
    const requestedByIng = new Map();

    for (const ing of ingredients) {
      const requested  = requestedMap.get(Number(ing.ingredient_id)) ?? Number(ing.base_quantity);
      const recipeUnit = ing.unit;
      requestedByIng.set(ing.ingredient_id, requested);

      const sameIngRows = await query(
        `SELECT s.supplier_id, ls.business_name AS supplier_name,
                s.price_per_unit, s.current_stock, s.unit
         FROM Stocks s
         JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
         WHERE s.ingredient_id = ? AND s.current_stock > 0`,
        [ing.ingredient_id]
      );

      const sameIng = sameIngRows
        .filter((r) => compatible(r.unit, recipeUnit))
        .map((r) => annotateOption(r, ing, requested, recipeUnit, 1));
      sortOptions(sameIng);
      sameIngByIng.set(ing.ingredient_id, sameIng);

      let recipeSubstitutes = await query(
        `SELECT asub.substitute_item_id AS ingredient_id,
                i_sub.name AS ingredient_name,
                asub.quantity_multiplier,
                s.supplier_id, ls.business_name AS supplier_name,
                s.price_per_unit, s.current_stock, s.unit
         FROM Allows_Substitution asub
         JOIN Ingredient i_sub ON asub.substitute_item_id = i_sub.ingredient_id
         JOIN Stocks s ON asub.substitute_item_id = s.ingredient_id
         JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
         WHERE asub.recipe_id = ?
           AND asub.original_item_id = ?
           AND s.current_stock > 0`,
        [recipeId, ing.ingredient_id]
      );

      if (recipeSubstitutes.length === 0) {
        recipeSubstitutes = await query(
          `SELECT i.ingredient_id, i.name AS ingredient_name, 1.0 AS quantity_multiplier,
                  s.supplier_id, ls.business_name AS supplier_name,
                  s.price_per_unit, s.current_stock, s.unit
           FROM Ingredient i
           JOIN Stocks s ON i.ingredient_id = s.ingredient_id
           JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
           WHERE i.generic_taxonomy_name = ?
             AND i.ingredient_id <> ?
             AND s.current_stock > 0
           LIMIT 10`,
          [ing.generic_taxonomy_name, ing.ingredient_id]
        );
      }

      const substitutes = recipeSubstitutes
        .filter((r) => compatible(r.unit, recipeUnit))
        .map((r) => {
          const mult = Number(r.quantity_multiplier ?? 1);
          return annotateOption(r, ing, requested, recipeUnit, mult);
        });
      sortOptions(substitutes);
      substitutesByIng.set(ing.ingredient_id, substitutes);
    }

    // Greedy supplier-consolidation pass over same-ingredient candidates.
    // Each round: for every still-unassigned ingredient, count which
    // suppliers can fulfill it (has_enough only), pick the supplier
    // covering the most ingredients (ties → cheapest aggregate price).
    const assigned = new Map(); // ingredient_id -> chosen option (same-ingredient supplier)
    const remaining = new Set(ingredients.map((i) => i.ingredient_id).filter((id) => {
      // skip ingredients with zero has_enough candidates — they fall through to fallback below
      return (sameIngByIng.get(id) ?? []).some((s) => s.has_enough);
    }));

    while (remaining.size > 0) {
      const supplierMap = new Map(); // supplier_id -> { options: [{ ingId, option }], totalPrice }
      for (const ingId of remaining) {
        for (const s of (sameIngByIng.get(ingId) ?? [])) {
          if (!s.has_enough) continue;
          if (!supplierMap.has(s.supplier_id)) {
            supplierMap.set(s.supplier_id, { options: [], totalPrice: 0 });
          }
          const e = supplierMap.get(s.supplier_id);
          e.options.push({ ingId, option: s });
          e.totalPrice += Number(s.price_per_unit) * Number(requestedByIng.get(ingId) ?? 0);
        }
      }
      if (supplierMap.size === 0) break;

      const sorted = [...supplierMap.entries()].sort((a, b) => {
        if (a[1].options.length !== b[1].options.length) return b[1].options.length - a[1].options.length;
        return a[1].totalPrice - b[1].totalPrice;
      });
      const best = sorted[0][1];
      for (const { ingId, option } of best.options) {
        assigned.set(ingId, option);
        remaining.delete(ingId);
      }
    }

    // Fallback for any ingredient with no has_enough candidate: use the
    // sorted-first same-ingredient row (cheapest, even if insufficient) so
    // the picker still surfaces something + flags it as insufficient.
    for (const ing of ingredients) {
      if (!assigned.has(ing.ingredient_id)) {
        const list = sameIngByIng.get(ing.ingredient_id) ?? [];
        if (list.length > 0) assigned.set(ing.ingredient_id, list[0]);
      }
    }

    const plan = ingredients.map((ing) => {
      const preferred = assigned.get(ing.ingredient_id) ?? null;
      const sameIngAll = sameIngByIng.get(ing.ingredient_id) ?? [];
      const otherSuppliers = preferred
        ? sameIngAll.filter((s) => s.supplier_id !== preferred.supplier_id)
        : sameIngAll;
      const substitutes = substitutesByIng.get(ing.ingredient_id) ?? [];
      return {
        ingredient_id:      ing.ingredient_id,
        ingredient_name:    ing.name,
        base_quantity:      ing.base_quantity,
        requested_quantity: requestedByIng.get(ing.ingredient_id),
        unit:               ing.unit,
        in_stock:           preferred !== null,
        preferred_supplier: preferred,
        alternatives:       [...otherSuppliers, ...substitutes],
      };
    });

    res.json(plan);
  } catch (err) {
    console.error('POST /substitutions/plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function annotateOption(row, ing, requested, recipeUnit, mult) {
  const stockUnit  = row.unit;
  const enough     = hasEnough(row.current_stock, stockUnit, requested * mult, recipeUnit);
  const oneRecipeUnitInStockUnit = convert(1, recipeUnit, stockUnit);
  const pricePerRecipeUnit = oneRecipeUnitInStockUnit == null
    ? Number(row.price_per_unit) || 0
    : (Number(row.price_per_unit) || 0) * oneRecipeUnitInStockUnit;
  return {
    ...row,
    ingredient_id:   row.ingredient_id ?? ing.ingredient_id,
    ingredient_name: row.ingredient_name ?? ing.name,
    price_per_unit:  pricePerRecipeUnit,
    has_enough:      enough,
  };
}

function sortOptions(list) {
  list.sort((a, b) => {
    if (a.has_enough !== b.has_enough) return a.has_enough ? -1 : 1;
    return Number(a.price_per_unit) - Number(b.price_per_unit);
  });
}

module.exports = router;
