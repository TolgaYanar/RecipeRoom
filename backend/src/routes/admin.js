const express = require('express');
const { query } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require a valid login AND Administrator role
router.use(requireLogin, requireRole('Administrator'));

// GET /api/admin/pending-chefs
// Schema has no pending state — all registered chefs are in Verified_Chef.
// Returns all chefs so the admin panel can manage them.
router.get('/pending-chefs', async (req, res) => {
  try {
    const chefs = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              vc.verification_date, vc.royalty_points
       FROM Verified_Chef vc
       JOIN User u ON vc.user_id = u.user_id
       ORDER BY u.join_date ASC`
    );

    res.json(chefs);
  } catch (err) {
    console.error('Error fetching chefs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/approve
// Chef is already in Verified_Chef on registration — no state to flip.
router.post('/chefs/:id/approve', async (req, res) => {
  try {
    const chefId = parseInt(req.params.id);
    if (isNaN(chefId)) {
      return res.status(400).json({ error: 'Invalid chef ID' });
    }

    const [chef] = await query('SELECT user_id FROM Verified_Chef WHERE user_id = ?', [chefId]);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    res.json({ message: 'Chef approved successfully' });
  } catch (err) {
    console.error('Error approving chef:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/reject
// Revokes chef status by removing the Verified_Chef row.
router.post('/chefs/:id/reject', async (req, res) => {
  try {
    const chefId = parseInt(req.params.id);
    if (isNaN(chefId)) {
      return res.status(400).json({ error: 'Invalid chef ID' });
    }

    const result = await query('DELETE FROM Verified_Chef WHERE user_id = ?', [chefId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chef not found' });
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
      `SELECT ingredient_id, name, generic_taxonomy_name, calories_per_unit,
              protein_g, carbs_g, fat_g
       FROM Ingredient ORDER BY name ASC`
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
    const { name, generic_taxonomy_name, calories_per_unit, protein_g, carbs_g, fat_g } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!generic_taxonomy_name || typeof generic_taxonomy_name !== 'string' || generic_taxonomy_name.trim().length === 0) {
      return res.status(400).json({ error: 'generic_taxonomy_name is required' });
    }

    const result = await query(
      `INSERT INTO Ingredient (name, generic_taxonomy_name, calories_per_unit, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        generic_taxonomy_name.trim(),
        calories_per_unit || null,
        protein_g || null,
        carbs_g || null,
        fat_g || null,
      ]
    );

    res.status(201).json({ ingredient_id: result.insertId, message: 'Ingredient created' });
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

    const { name, generic_taxonomy_name, calories_per_unit, protein_g, carbs_g, fat_g } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!generic_taxonomy_name || typeof generic_taxonomy_name !== 'string' || generic_taxonomy_name.trim().length === 0) {
      return res.status(400).json({ error: 'generic_taxonomy_name is required' });
    }

    const result = await query(
      `UPDATE Ingredient
       SET name = ?, generic_taxonomy_name = ?, calories_per_unit = ?,
           protein_g = ?, carbs_g = ?, fat_g = ?
       WHERE ingredient_id = ?`,
      [
        name.trim(),
        generic_taxonomy_name.trim(),
        calories_per_unit || null,
        protein_g || null,
        carbs_g || null,
        fat_g || null,
        ingredientId,
      ]
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

    // Check if ingredient is referenced in any recipe (Requires table)
    const [usage] = await query(
      'SELECT COUNT(*) AS count FROM Requires WHERE ingredient_id = ?',
      [ingredientId]
    );

    if (usage.count > 0) {
      return res.status(409).json({ error: 'Cannot delete ingredient used in recipes' });
    }

    const result = await query('DELETE FROM Ingredient WHERE ingredient_id = ?', [ingredientId]);

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
// For recipe: :id = recipe_id. Body: { action }
// For review: :id = recipe_id, body: { reviewer_id }
router.post('/content/:type/:id/moderate', async (req, res) => {
  try {
    const { type, id } = req.params;
    const contentId = parseInt(id);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: 'Invalid content ID' });
    }

    if (type === 'recipe') {
      const { action } = req.body;
      if (!action || typeof action !== 'string' || action.trim().length === 0) {
        return res.status(400).json({ error: 'action is required' });
      }

      const [recipe] = await query('SELECT recipe_id FROM Recipe WHERE recipe_id = ?', [contentId]);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Upsert into Moderates — PK is (recipe_id, user_id)
      await query(
        `INSERT INTO Moderates (recipe_id, user_id, action, moderation_date)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE action = ?, moderation_date = NOW()`,
        [contentId, req.user.id, action.trim(), action.trim()]
      );

      res.json({ message: 'Recipe moderated' });
    } else if (type === 'review') {
      const { reviewer_id } = req.body;
      const reviewerId = parseInt(reviewer_id);
      if (isNaN(reviewerId)) {
        return res.status(400).json({ error: 'Valid reviewer_id is required' });
      }

      // Rates_Review PK is (recipe_id, user_id, timestamp) — delete all reviews
      // from this reviewer for this recipe (contentId = recipe_id)
      const result = await query(
        'DELETE FROM Rates_Review WHERE recipe_id = ? AND user_id = ?',
        [contentId, reviewerId]
      );

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

// GET /api/admin/users
// Joins User against the four subtype tables to resolve user_type.
// AdminPanel uses this for User Management and to derive overview KPIs.
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              CASE
                WHEN a.user_id  IS NOT NULL THEN 'Administrator'
                WHEN vc.user_id IS NOT NULL THEN 'Verified_Chef'
                WHEN ls.user_id IS NOT NULL THEN 'Local_Supplier'
                WHEN hc.user_id IS NOT NULL THEN 'Home_Cook'
                ELSE NULL
              END AS user_type,
              ls.business_name AS supplier_name,
              ls.address       AS supplier_address
       FROM User u
       LEFT JOIN Administrator   a  ON u.user_id = a.user_id
       LEFT JOIN Verified_Chef   vc ON u.user_id = vc.user_id
       LEFT JOIN Local_Supplier  ls ON u.user_id = ls.user_id
       LEFT JOIN Home_Cook       hc ON u.user_id = hc.user_id
       ORDER BY u.join_date DESC`
    );

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/pending-suppliers — mirrors /pending-chefs
router.get('/pending-suppliers', async (req, res) => {
  try {
    const suppliers = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              ls.business_name, ls.address, ls.contact_number
       FROM Local_Supplier ls
       JOIN User u ON ls.user_id = u.user_id
       ORDER BY u.join_date ASC`
    );

    res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/suppliers/:id/approve — no-op (already in Local_Supplier)
router.post('/suppliers/:id/approve', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }

    const [supplier] = await query(
      'SELECT user_id FROM Local_Supplier WHERE user_id = ?',
      [supplierId]
    );
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier approved successfully' });
  } catch (err) {
    console.error('Error approving supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/suppliers/:id/reject — revoke supplier status
router.post('/suppliers/:id/reject', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }

    const result = await query(
      'DELETE FROM Local_Supplier WHERE user_id = ?',
      [supplierId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier rejected successfully' });
  } catch (err) {
    console.error('Error rejecting supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delegate admin highlight CRUD to highlights router
const highlightsRouter = require('./highlights');
router.use('/highlights', (req, res, next) => {
  // Rewrite path so highlights router sees /admin prefix correctly
  req.url = '/admin' + (req.url === '/' ? '' : req.url);
  highlightsRouter(req, res, next);
});
module.exports = router;
