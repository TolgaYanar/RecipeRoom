const express = require('express');
const { query } = require('../utils/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Get all reviews for a recipe, ordered by most recent
router.get('/recipe/:id', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const reviews = await query(
      `SELECT rr.recipe_id, rr.user_id, rr.score, rr.review_text AS body,
              rr.timestamp, u.UserName AS author
       FROM Rates_Review rr
       JOIN User u ON rr.user_id = u.user_id
       WHERE rr.recipe_id = ?
       ORDER BY rr.timestamp DESC`,
      [recipeId]
    );

    res.json(reviews);
  } catch (err) {
    console.error('GET /reviews/recipe/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a new review - one per user per recipe enforced by PK (recipe_id, user_id, timestamp)
router.post('/recipe/:id', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    // Check if the recipe exists
    const [recipe] = await query('SELECT recipe_id FROM Recipe WHERE recipe_id = ?', [recipeId]);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Check if user already reviewed this recipe - prevent spamming
    const existing = await query(
      'SELECT COUNT(*) AS cnt FROM Rates_Review WHERE recipe_id = ? AND user_id = ?',
      [recipeId, req.user.id]
    );
    if (existing[0].cnt > 0) {
      return res.status(409).json({ error: 'You have already reviewed this recipe' });
    }

    await query(
      `INSERT INTO Rates_Review (recipe_id, user_id, score, review_text, timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [recipeId, req.user.id, score, comment?.trim() || null]
    );

    res.status(201).json({ message: 'Review posted' });
  } catch (err) {
    console.error('POST /reviews/recipe/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a review - only the owner can delete their own review
router.delete('/:recipeId', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const result = await query(
      'DELETE FROM Rates_Review WHERE recipe_id = ? AND user_id = ?',
      [recipeId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /reviews/:recipeId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;