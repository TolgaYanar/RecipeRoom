const express = require('express');
const { query } = require('../utils/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Get user's flavor profile - reads Has_Affinity joined with Ingredient
router.get('/', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const items = await query(
      `SELECT ha.ingredient_id, i.name AS ingredient,
              i.generic_taxonomy_name AS category,
              ha.affinity_score AS score, ha.is_inferred AS auto
       FROM Has_Affinity ha
       JOIN Ingredient i ON ha.ingredient_id = i.ingredient_id
       WHERE ha.user_id = ?
       ORDER BY ha.affinity_score DESC`,
      [userId]
    );

    res.json(items);
  } catch (err) {
    console.error('GET /flavor-profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually upsert affinity scores
router.put('/', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { items = [] } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

    // Upsert each affinity item
    for (const item of items) {
      if (!item.ingredient_id || item.score == null) continue;
      await query(
        `INSERT INTO Has_Affinity (user_id, ingredient_id, affinity_score, is_inferred)
         VALUES (?, ?, ?, FALSE)
         ON DUPLICATE KEY UPDATE affinity_score = ?, is_inferred = FALSE`,
        [userId, item.ingredient_id, item.score, item.score]
      );
    }

    res.json({ message: 'Flavor profile updated' });
  } catch (err) {
    console.error('PUT /flavor-profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-infer affinity from cook log history
router.post('/infer', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query(
      `INSERT INTO Has_Affinity (user_id, ingredient_id, affinity_score, is_inferred)
       SELECT lc.user_id,
              req.ingredient_id,
              LEAST(100, COUNT(*) * 10) AS affinity_score,
              TRUE
       FROM Logs_Cook lc
       JOIN Requires req ON lc.recipe_id = req.recipe_id
       WHERE lc.user_id = ?
       GROUP BY lc.user_id, req.ingredient_id
       ON DUPLICATE KEY UPDATE
         affinity_score = LEAST(100, Has_Affinity.affinity_score + 5),
         is_inferred = TRUE`,
      [userId]
    );

    res.json({ message: 'Flavor profile inferred from cook log' });
  } catch (err) {
    console.error('POST /flavor-profile/infer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get personalized recipe recommendations ranked by affinity score
router.get('/recommendations', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recommendations = await query(
      `SELECT rs.recipe_id, rs.title, rs.thumbnail_url, rs.avg_rating,
              rs.cooking_time, rs.difficulty, rs.publisher_name,
              rs.is_verified_chef,
              SUM(ha.affinity_score) AS affinity_match_score
       FROM Recipe_Summary rs
       JOIN Requires req ON rs.recipe_id = req.recipe_id
       JOIN Has_Affinity ha ON req.ingredient_id = ha.ingredient_id
         AND ha.user_id = ?
       WHERE rs.recipe_id NOT IN (
         SELECT recipe_id FROM Logs_Cook WHERE user_id = ?
       )
       GROUP BY rs.recipe_id, rs.title, rs.thumbnail_url, rs.avg_rating,
                rs.cooking_time, rs.difficulty, rs.publisher_name, rs.is_verified_chef
       ORDER BY affinity_match_score DESC, rs.avg_rating DESC
       LIMIT 12`,
      [userId, userId]
    );

    res.json(recommendations);
  } catch (err) {
    console.error('GET /flavor-profile/recommendations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;