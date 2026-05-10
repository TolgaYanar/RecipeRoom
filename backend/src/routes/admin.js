const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require a valid login AND Administrator role
router.use(requireLogin, requireRole('Administrator'));

// GET /api/admin/pending-chefs — chefs awaiting verification.
router.get('/pending-chefs', async (req, res) => {
  try {
    const chefs = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              vc.verification_date, vc.royalty_points
       FROM Verified_Chef vc
       JOIN User u ON vc.user_id = u.user_id
       WHERE vc.is_verified = FALSE
       ORDER BY u.join_date ASC`
    );

    res.json(chefs);
  } catch (err) {
    console.error('Error fetching chefs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/approve — flip is_verified so the chef
// drops out of the pending list.
router.post('/chefs/:id/approve', async (req, res) => {
  try {
    const chefId = parseInt(req.params.id);
    if (isNaN(chefId)) {
      return res.status(400).json({ error: 'Invalid chef ID' });
    }

    const result = await query(
      'UPDATE Verified_Chef SET is_verified = TRUE WHERE user_id = ?',
      [chefId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    res.json({ message: 'Chef approved successfully' });
  } catch (err) {
    console.error('Error approving chef:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/chefs/:id/reject
// Revokes chef status. Drops them down to Home_Cook so they have a
// usable role rather than no role at all.
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

    await query('INSERT IGNORE INTO Home_Cook (user_id) VALUES (?)', [chefId]);

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

// GET /api/admin/pending-suppliers — suppliers awaiting verification.
router.get('/pending-suppliers', async (req, res) => {
  try {
    const suppliers = await query(
      `SELECT u.user_id, u.UserName AS username, u.Email AS email, u.join_date,
              ls.business_name, ls.address, ls.contact_number
       FROM Local_Supplier ls
       JOIN User u ON ls.user_id = u.user_id
       WHERE ls.is_verified = FALSE
       ORDER BY u.join_date ASC`
    );

    res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/suppliers/:id/approve — flip is_verified.
router.post('/suppliers/:id/approve', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }

    const result = await query(
      'UPDATE Local_Supplier SET is_verified = TRUE WHERE user_id = ?',
      [supplierId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier approved successfully' });
  } catch (err) {
    console.error('Error approving supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/suppliers/:id/reject — revoke supplier status and
// drop them to Home_Cook for the same reason as chef-reject.
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

    await query('INSERT IGNORE INTO Home_Cook (user_id) VALUES (?)', [supplierId]);

    res.json({ message: 'Supplier rejected successfully' });
  } catch (err) {
    console.error('Error rejecting supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/activity — recent platform events, newest first
router.get('/activity', async (req, res) => {
  try {
    const events = await query(
      `(SELECT 'new_user'  AS type,
               u.UserName  AS actor,
               'joined the platform' AS detail,
               NULL        AS subject,
               u.join_date AS ts
        FROM User u)
       UNION ALL
       (SELECT 'cook_log',
               u.UserName,
               'cooked',
               r.title,
               CAST(lc.date_cook AS DATETIME)
        FROM Logs_Cook lc
        JOIN User   u ON lc.user_id   = u.user_id
        JOIN Recipe r ON lc.recipe_id = r.recipe_id)
       UNION ALL
       (SELECT 'review',
               u.UserName,
               'reviewed',
               r.title,
               rr.timestamp
        FROM Rates_Review rr
        JOIN User   u ON rr.user_id   = u.user_id
        JOIN Recipe r ON rr.recipe_id = r.recipe_id)
       UNION ALL
       (SELECT 'order',
               u.UserName,
               'placed an order for',
               r.title,
               o.order_date
        FROM Orders o
        JOIN User   u ON o.creator_id = u.user_id
        JOIN Recipe r ON o.recipe_id  = r.recipe_id)
       UNION ALL
       (SELECT 'moderation',
               u.UserName,
               CONCAT('moderated (', m.action, ')'),
               r.title,
               m.moderation_date
        FROM Moderates m
        JOIN User   u ON m.user_id   = u.user_id
        JOIN Recipe r ON m.recipe_id = r.recipe_id)
       ORDER BY ts DESC
       LIMIT 20`
    );
    res.json(events);
  } catch (err) {
    console.error('Error fetching activity:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delegate admin highlight CRUD to highlights router
const highlightsRouter = require('./highlights');
// DELETE /api/admin/users/:id
// Removes the User row; FKs cascade to all role + activity tables.
// Admins can't delete themselves — that'd lock them out mid-action.
router.delete('/users/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });
    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You can't delete your own admin account" });
    }

    const result = await query('DELETE FROM User WHERE user_id = ?', [targetId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/promote-chef
// Adds a Verified_Chef row, marked already-verified since an admin
// did the promotion. Refuses if the user already has any role beyond
// Home_Cook.
router.post('/users/:id/promote-chef', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });

    const [user] = await query('SELECT user_id FROM User WHERE user_id = ?', [targetId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [chef] = await query('SELECT user_id FROM Verified_Chef WHERE user_id = ?', [targetId]);
    if (chef) return res.status(409).json({ error: 'User is already a chef' });
    const [supplier] = await query('SELECT user_id FROM Local_Supplier WHERE user_id = ?', [targetId]);
    if (supplier) return res.status(409).json({ error: 'User is a supplier — demote first' });

    await query(
      `INSERT INTO Verified_Chef (user_id, verification_date, royalty_points, is_verified)
       VALUES (?, CURDATE(), 0, TRUE)`,
      [targetId]
    );
    res.json({ message: 'User promoted to chef' });
  } catch (err) {
    console.error('POST /admin/users/:id/promote-chef error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/demote-chef
// Removes a Verified_Chef row and ensures the user lands as a Home_Cook
// — chef registration doesn't create a Home_Cook row, so without this
// fallback the user would have no role at all and show as "—".
router.post('/users/:id/demote-chef', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });

    const result = await query('DELETE FROM Verified_Chef WHERE user_id = ?', [targetId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User is not a chef' });

    await query('INSERT IGNORE INTO Home_Cook (user_id) VALUES (?)', [targetId]);

    res.json({ message: 'Chef status revoked' });
  } catch (err) {
    console.error('POST /admin/users/:id/demote-chef error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/reset-password
// Admin-driven password reset. Body: { new_password }. The admin is
// expected to communicate the new password to the user out of band.
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { new_password } = req.body || {};
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    const result = await query(
      'UPDATE User SET passwordHash = ? WHERE user_id = ?',
      [hash, targetId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Password reset' });
  } catch (err) {
    console.error('POST /admin/users/:id/reset-password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/tags — populate the required_tag dropdown on the
// Create Challenge form. Public tags table, no other endpoint exposed it.
router.get('/tags', async (req, res) => {
  try {
    const tags = await query('SELECT tag_id, tag_name FROM Tag ORDER BY tag_name');
    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/badges — populate the badge prize dropdown.
router.get('/badges', async (req, res) => {
  try {
    const badges = await query(
      'SELECT badge_id, name, description, icon_url FROM Badge ORDER BY name'
    );
    res.json(badges);
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use('/highlights', (req, res, next) => {
  // Rewrite path so highlights router sees /admin prefix correctly
  req.url = '/admin' + (req.url === '/' ? '' : req.url);
  highlightsRouter(req, res, next);
});
module.exports = router;
