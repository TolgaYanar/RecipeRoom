const express = require('express');
const { query } = require('../utils/db');
const { requireLogin } = require('../middleware/auth');
const { awardChallengeScore } = require('./orders');

const router = express.Router({ mergeParams: true });

// Log a cook entry for a recipe - called when user clicks "I Cooked This"
router.post('/', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { recipe_id, scaled_serving = 1 } = req.body;
    const recipeId = parseInt(recipe_id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Valid recipe_id is required' });

    // Check recipe exists
    const [recipe] = await query('SELECT recipe_id FROM Recipe WHERE recipe_id = ?', [recipeId]);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // ON DUPLICATE KEY UPDATE handles same-day re-logging gracefully
    await query(
      `INSERT INTO Logs_Cook (recipe_id, user_id, date_cook, scaled_serving)
       VALUES (?, ?, CURDATE(), ?)
       ON DUPLICATE KEY UPDATE scaled_serving = ?`,
      [recipeId, userId, scaled_serving, scaled_serving]
    );

    // Award challenge score if this recipe qualifies for any active challenge
    await awardChallengeScore(userId, recipeId, 1);

    res.status(201).json({ message: 'Cook logged' });
  } catch (err) {
    console.error('POST /cook-log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cook log history for a user with recipe details, supports pagination
router.get('/', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

const entries = await query(
  `SELECT lc.recipe_id, lc.date_cook, lc.scaled_serving,
          rs.title, rs.thumbnail_url, rs.difficulty, rs.cooking_time,
          rs.publisher_name
   FROM Logs_Cook lc
   JOIN Recipe_Summary rs ON lc.recipe_id = rs.recipe_id
   WHERE lc.user_id = ?
   ORDER BY lc.date_cook DESC
   LIMIT ${Number(limit)} OFFSET ${offset}`,
  [userId]
);

    res.json(entries);
  } catch (err) {
    console.error('GET /cook-log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a specific cook log entry
router.delete('/:entryId', requireLogin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recipeId = parseInt(req.params.entryId);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid entry ID' });

    const result = await query(
      'DELETE FROM Logs_Cook WHERE recipe_id = ? AND user_id = ?',
      [recipeId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cook log entry not found' });
    }

    res.json({ message: 'Cook log entry deleted' });
  } catch (err) {
    console.error('DELETE /cook-log/:entryId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;