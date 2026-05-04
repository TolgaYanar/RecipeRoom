const express = require('express');
const { query } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public endpoints

// Get home feed: featured selections, trending recipes, active challenges
// This is the main endpoint consumed by the Home page
router.get('/home', async (req, res) => {
  try {
    // Featured: active curator-picked selections with their recipes
    const featured = await query(
      `SELECT rs.recipe_id, rs.title, rs.thumbnail_url, rs.avg_rating,
              rs.cooking_time, rs.difficulty, rs.publisher_name,
              rs.is_verified_chef, fs.selection_type
       FROM Featured_Selection fs
       JOIN Highlights h ON fs.selection_id = h.selection_id
       JOIN Recipe_Summary rs ON h.recipe_id = rs.recipe_id
       WHERE NOW() BETWEEN fs.start_date AND fs.end_date
       ORDER BY fs.start_date DESC`
    );

    // Trending: most cooked recipes in the last 30 days
    const trending = await query(
      `SELECT rs.recipe_id, rs.title, rs.thumbnail_url, rs.avg_rating,
              rs.cooking_time, rs.difficulty, rs.publisher_name,
              rs.is_verified_chef, COUNT(lc.recipe_id) AS cook_count
       FROM Logs_Cook lc
       JOIN Recipe_Summary rs ON lc.recipe_id = rs.recipe_id
       WHERE lc.date_cook >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY rs.recipe_id, rs.title, rs.thumbnail_url, rs.avg_rating,
                rs.cooking_time, rs.difficulty, rs.publisher_name, rs.is_verified_chef
       ORDER BY cook_count DESC
       LIMIT 8`
    );

    // Active challenges for the home page strip
    const active_challenges = await query(
      `SELECT kc.challenge_id AS id, kc.title AS name, kc.description,
              kc.start_date, kc.end_date,
              DATEDIFF(kc.end_date, CURDATE()) AS days_left,
              COUNT(pi.user_id) AS joined,
              t.tag_name AS required_tag,
              b.name AS badge_name, b.icon_url AS badge_icon
       FROM Kitchen_Challenge kc
       LEFT JOIN Participates_in pi ON kc.challenge_id = pi.challenge_id
       LEFT JOIN Tag t ON kc.required_tag_id = t.tag_id
       LEFT JOIN Offers o ON kc.challenge_id = o.challenge_id
       LEFT JOIN Badge b ON o.badge_id = b.badge_id
       WHERE CURDATE() BETWEEN kc.start_date AND kc.end_date
       GROUP BY kc.challenge_id, kc.title, kc.description,
                kc.start_date, kc.end_date, t.tag_name, b.name, b.icon_url`
    );

    // Personalized recommendations for logged-in users, falls back to empty array
let recommendations = [];
const authHeader = req.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const userId = payload.user_id;

    recommendations = await query(
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
  } catch {
    // Invalid or expired token - fall back to empty array
    recommendations = [];
  }
}

res.json({ featured, trending, recommendations, active_challenges });
  } catch (err) {
    console.error('GET /highlights/home error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints

// List all featured selections (active + past) for admin panel
router.get('/admin', requireLogin, requireRole('Administrator'), async (req, res) => {
  try {
    const selections = await query(
      `SELECT fs.selection_id, fs.selection_type, fs.start_date, fs.end_date,
              u.UserName AS curator_name,
              COUNT(h.recipe_id) AS recipe_count,
              (NOW() BETWEEN fs.start_date AND fs.end_date) AS is_active
       FROM Featured_Selection fs
       LEFT JOIN User u ON fs.curator_id = u.user_id
       LEFT JOIN Highlights h ON fs.selection_id = h.selection_id
       GROUP BY fs.selection_id, fs.selection_type, fs.start_date,
                fs.end_date, u.UserName
       ORDER BY fs.start_date DESC`
    );

    res.json(selections);
  } catch (err) {
    console.error('GET /highlights/admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new featured selection with recipe highlights
router.post('/admin', requireLogin, requireRole('Administrator'), async (req, res) => {
  try {
    const { selection_type, start_date, end_date, recipe_ids = [] } = req.body;

    if (!selection_type?.trim()) return res.status(400).json({ error: 'selection_type is required' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });

    // Insert the featured selection row
    const result = await query(
      `INSERT INTO Featured_Selection (selection_type, start_date, end_date, curator_id)
       VALUES (?, ?, ?, ?)`,
      [selection_type.trim(), start_date, end_date, req.user.id]
    );

    const selectionId = result.insertId;

    // Link recipes to this selection via Highlights table
    for (const recipeId of recipe_ids) {
      await query(
        'INSERT IGNORE INTO Highlights (selection_id, recipe_id) VALUES (?, ?)',
        [selectionId, recipeId]
      );
    }

    res.status(201).json({ selection_id: selectionId, message: 'Featured selection created' });
  } catch (err) {
    console.error('POST /highlights/admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an existing featured selection's dates or type
router.patch('/admin/:id', requireLogin, requireRole('Administrator'), async (req, res) => {
  try {
    const selectionId = parseInt(req.params.id);
    if (isNaN(selectionId)) return res.status(400).json({ error: 'Invalid selection ID' });

    const { selection_type, start_date, end_date } = req.body;

    const [existing] = await query(
      'SELECT selection_id FROM Featured_Selection WHERE selection_id = ?',
      [selectionId]
    );
    if (!existing) return res.status(404).json({ error: 'Featured selection not found' });

    // Build update dynamically — only update provided fields
    const setClauses = [];
    const params = [];
    if (selection_type) { setClauses.push('selection_type = ?'); params.push(selection_type.trim()); }
    if (start_date)     { setClauses.push('start_date = ?');     params.push(start_date); }
    if (end_date)       { setClauses.push('end_date = ?');       params.push(end_date); }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(selectionId);
    await query(
      `UPDATE Featured_Selection SET ${setClauses.join(', ')} WHERE selection_id = ?`,
      params
    );

    res.json({ message: 'Featured selection updated' });
  } catch (err) {
    console.error('PATCH /highlights/admin/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a featured selection (cascades to Highlights table)
router.delete('/admin/:id', requireLogin, requireRole('Administrator'), async (req, res) => {
  try {
    const selectionId = parseInt(req.params.id);
    if (isNaN(selectionId)) return res.status(400).json({ error: 'Invalid selection ID' });

    const result = await query(
      'DELETE FROM Featured_Selection WHERE selection_id = ?',
      [selectionId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Featured selection not found' });

    res.json({ message: 'Featured selection deleted' });
  } catch (err) {
    console.error('DELETE /highlights/admin/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;