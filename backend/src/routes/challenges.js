const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');
 
const router = express.Router();
 
// ─────────────────────────────────────────────
// GET /api/challenges
// All challenges (active + past) with participant count and badge.
// SQL: SELECT kc.*, t.tag_name, b.name, COUNT(pi.user_id)
//      FROM Kitchen_Challenge kc JOIN Tag JOIN Offers JOIN Badge
//      LEFT JOIN Participates_in GROUP BY kc.challenge_id
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const challenges = await query(
      `SELECT kc.challenge_id, kc.title, kc.description,
              kc.start_date, kc.end_date, kc.required_tag_id,
              t.tag_name AS required_tag_name,
              COUNT(DISTINCT pi.user_id) AS participant_count,
              b.badge_id, b.name AS badge_name, b.icon_url AS badge_icon,
              (kc.start_date <= CURDATE() AND kc.end_date >= CURDATE()) AS is_active,
              (kc.end_date < CURDATE()) AS has_ended
       FROM Kitchen_Challenge kc
       JOIN Tag t ON kc.required_tag_id = t.tag_id
       LEFT JOIN Offers o ON kc.challenge_id = o.challenge_id
       LEFT JOIN Badge b ON o.badge_id = b.badge_id
       LEFT JOIN Participates_in pi ON kc.challenge_id = pi.challenge_id
       GROUP BY kc.challenge_id, kc.title, kc.description,
                kc.start_date, kc.end_date, kc.required_tag_id,
                t.tag_name, b.badge_id, b.name, b.icon_url
       ORDER BY kc.end_date DESC`
    );
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/challenges/:id
// Challenge detail + leaderboard ranked by score.
// SQL: same as above for one row + leaderboard:
//      SELECT u.UserName, pi.score FROM Participates_in JOIN User
//      WHERE challenge_id = ? ORDER BY score DESC
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) return res.status(400).json({ error: 'Invalid challenge ID' });
   
    try {
      const [challenge] = await query(
        `SELECT kc.challenge_id, kc.title, kc.description,
                kc.start_date, kc.end_date, kc.required_tag_id,
                t.tag_name AS required_tag_name,
                (kc.start_date <= CURDATE() AND kc.end_date >= CURDATE()) AS is_active,
                (kc.end_date < CURDATE()) AS has_ended,
                b.badge_id, b.name AS badge_name,
                b.description AS badge_description, b.icon_url AS badge_icon
         FROM Kitchen_Challenge kc
         JOIN Tag t ON kc.required_tag_id = t.tag_id
         LEFT JOIN Offers o ON kc.challenge_id = o.challenge_id
         LEFT JOIN Badge b ON o.badge_id = b.badge_id
         WHERE kc.challenge_id = ?`,
        [challengeId]
      );
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
   
      // Leaderboard — participants ranked by score
      // progress_status shows 'In Progress', 'Winner', or 'Completed'
      const leaderboard = await query(
        `SELECT pi.user_id, u.UserName AS username, pi.score, pi.progress_status
         FROM Participates_in pi
         JOIN User u ON pi.user_id = u.user_id
         WHERE pi.challenge_id = ?
         ORDER BY pi.score DESC, u.UserName ASC`,
        [challengeId]
      );
   
      // If logged-in user is a participant, include their own status
      // Frontend uses this to show "You are participating" / "Your score: X" / "Join" button
      let myParticipation = null;
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const { JWT_SECRET } = require('../middleware/auth');
          const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
          const [myRow] = await query(
            `SELECT pi.score, pi.progress_status
             FROM Participates_in pi
             WHERE pi.user_id = ? AND pi.challenge_id = ?`,
            [payload.user_id, challengeId]
          );
          myParticipation = myRow || null;
        } catch (_) {
          // token invalid or expired — just skip, myParticipation stays null
        }
      }
   
      res.json({ ...challenge, leaderboard, my_participation: myParticipation });
    } catch (err) {
      console.error('Error fetching challenge:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// POST /api/challenges
// Admin only. Creates a challenge.
// Body: { title, description?, start_date, end_date, required_tag_id, badge_id? }
// SQL: INSERT INTO Kitchen_Challenge ...
// ─────────────────────────────────────────────
router.post('/', requireLogin, requireRole('Administrator'), async (req, res) => {
    // badge_id        → link an existing seeded badge to this challenge
    // badge_name + badge_icon_url → create a new badge on the fly and link it
    // neither         → challenge is created without a badge reward
    const {
      title, description, start_date, end_date, required_tag_id,
      badge_id, badge_name, badge_description, badge_icon_url,
    } = req.body;
   
    if (!title || !start_date || !end_date || !required_tag_id) {
      return res.status(400).json({
        error: 'validation',
        fields: {
          title: !title ? 'Required' : undefined,
          start_date: !start_date ? 'Required' : undefined,
          end_date: !end_date ? 'Required' : undefined,
          required_tag_id: !required_tag_id ? 'Required' : undefined,
        },
      });
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: 'end_date must be after start_date' });
    }
   
    // If creating a new badge, icon_url is required (Badge table has UNIQUE NOT NULL on icon_url)
    const creatingNewBadge = !badge_id && badge_name;
    if (creatingNewBadge && !badge_icon_url) {
      return res.status(400).json({ error: 'badge_icon_url is required when creating a new badge' });
    }
   
    try {
      const [tag] = await query('SELECT tag_id FROM Tag WHERE tag_id = ?', [required_tag_id]);
      if (!tag) return res.status(404).json({ error: 'Tag not found' });
   
      // If linking existing badge, verify it exists before starting transaction
      if (badge_id) {
        const [existingBadge] = await query('SELECT badge_id FROM Badge WHERE badge_id = ?', [badge_id]);
        if (!existingBadge) return res.status(404).json({ error: 'Badge not found' });
      }
   
      const { challengeId, resolvedBadgeId } = await withTransaction(async (conn) => {
        // 1. Create the challenge
        const [result] = await conn.execute(
          `INSERT INTO Kitchen_Challenge (title, description, start_date, end_date, required_tag_id, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [title, description || null, start_date, end_date, required_tag_id, req.user.id]
        );
        const newChallengeId = result.insertId;
   
        let finalBadgeId = null;
   
        if (badge_id) {
          // Option A: link existing seeded badge
          finalBadgeId = badge_id;
        } else if (creatingNewBadge) {
          // Option B: create new badge on the fly
          const [badgeResult] = await conn.execute(
            `INSERT INTO Badge (name, description, icon_url) VALUES (?, ?, ?)`,
            [badge_name.trim(), badge_description?.trim() || null, badge_icon_url.trim()]
          );
          finalBadgeId = badgeResult.insertId;
        }
   
        // Link badge to challenge via Offers table (if any badge)
        if (finalBadgeId) {
          await conn.execute(
            'INSERT INTO Offers (badge_id, challenge_id) VALUES (?, ?)',
            [finalBadgeId, newChallengeId]
          );
        }
   
        return { challengeId: newChallengeId, resolvedBadgeId: finalBadgeId };
      });
   
      res.status(201).json({
        challenge_id: challengeId,
        badge_id: resolvedBadgeId,
        message: 'Challenge created',
      });
    } catch (err) {
      console.error('Error creating challenge:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'A badge with that name or icon URL already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// POST /api/challenges/:id/entries
// Home Cook joins a challenge. Endpoint name matches QUERY_MAP.
// Rules: challenge must not have ended, user must not already be participating.
// SQL: INSERT INTO Participates_in (user_id, challenge_id, 'In Progress') ON DUPLICATE KEY UPDATE
// ─────────────────────────────────────────────
router.post('/:id/entries', requireLogin, requireRole('Home_Cook'), async (req, res) => {
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) return res.status(400).json({ error: 'Invalid challenge ID' });
   
    try {
      const [challenge] = await query(
        'SELECT challenge_id, end_date FROM Kitchen_Challenge WHERE challenge_id = ?',
        [challengeId]
      );
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
      if (new Date(challenge.end_date) < new Date()) {
        return res.status(400).json({ error: 'This challenge has already ended' });
      }
   
      // ON DUPLICATE KEY UPDATE keeps existing score intact (idempotent re-join attempt)
      await query(
        `INSERT INTO Participates_in (user_id, challenge_id, progress_status, score)
         VALUES (?, ?, 'In Progress', 0)
         ON DUPLICATE KEY UPDATE progress_status = progress_status`,
        [req.user.id, challengeId]
      );
   
      res.status(201).json({ message: 'Joined challenge successfully' });
    } catch (err) {
      console.error('Error joining challenge:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// POST /api/challenges/:id/winner
// Admin only. Called after end_date has passed.
// Winner is determined automatically by highest score if the end date passed — admin does not pick manually.
// SQL: UPDATE Participates_in SET status='Winner';
//      INSERT INTO Unlocks SELECT badge_id FROM Offers WHERE challenge_id = ?
// ─────────────────────────────────────────────
router.post('/:id/winner', requireLogin, requireRole('Administrator'), async (req, res) => {
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) return res.status(400).json({ error: 'Invalid challenge ID' });
   
    try {
      const [challenge] = await query(
        'SELECT challenge_id, end_date FROM Kitchen_Challenge WHERE challenge_id = ?',
        [challengeId]
      );
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
      if (new Date(challenge.end_date) >= new Date()) {
        return res.status(400).json({ error: 'Challenge has not ended yet' });
      }
   
      const [alreadyWon] = await query(
        `SELECT COUNT(*) AS cnt FROM Participates_in
         WHERE challenge_id = ? AND progress_status = 'Winner'`,
        [challengeId]
      );
      if (alreadyWon.cnt > 0) {
        return res.status(409).json({ error: 'Challenge has already been finalized' });
      }
   
      const participants = await query(
        `SELECT pi.user_id, pi.score, u.UserName AS username
         FROM Participates_in pi
         JOIN User u ON pi.user_id = u.user_id
         WHERE pi.challenge_id = ? AND pi.progress_status = 'In Progress'
         ORDER BY pi.score DESC, pi.user_id ASC`,
        [challengeId]
      );
   
      if (participants.length === 0) {
        return res.status(400).json({ error: 'No participants to finalize' });
      }
   
      const winner = participants[0];
   
      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE Participates_in SET progress_status = 'Winner'
           WHERE user_id = ? AND challenge_id = ?`,
          [winner.user_id, challengeId]
        );
        await conn.execute(
          `UPDATE Participates_in SET progress_status = 'Completed'
           WHERE challenge_id = ? AND progress_status = 'In Progress'`,
          [challengeId]
        );
        await conn.execute(
          `INSERT IGNORE INTO Unlocks (user_id, badge_id)
           SELECT ?, badge_id FROM Offers WHERE challenge_id = ?`,
          [winner.user_id, challengeId]
        );
      });
   
      res.json({
        message: 'Challenge finalized — winner determined by highest score',
        winner: { user_id: winner.user_id, username: winner.username, score: winner.score },
      });
    } catch (err) {
      console.error('Error finalizing challenge:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// PATCH /api/challenges/:id
// Admin updates challenge metadata (title, description, dates).
// SQL: UPDATE Kitchen_Challenge ...
// ─────────────────────────────────────────────
router.patch('/:id', requireLogin, requireRole('Administrator'), async (req, res) => {
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) return res.status(400).json({ error: 'Invalid challenge ID' });
   
    const { title, description, start_date, end_date } = req.body;
    if (!title && !description && !start_date && !end_date) {
      return res.status(400).json({ error: 'Provide at least one field to update' });
    }
    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: 'end_date must be after start_date' });
    }
   
    try {
      const [challenge] = await query(
        'SELECT challenge_id FROM Kitchen_Challenge WHERE challenge_id = ?',
        [challengeId]
      );
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
   
      const setClauses = [];
      const params = [];
      if (title) { setClauses.push('title = ?'); params.push(title); }
      if (description !== undefined) { setClauses.push('description = ?'); params.push(description); }
      if (start_date) { setClauses.push('start_date = ?'); params.push(start_date); }
      if (end_date) { setClauses.push('end_date = ?'); params.push(end_date); }
      params.push(challengeId);
   
      await query(
        `UPDATE Kitchen_Challenge SET ${setClauses.join(', ')} WHERE challenge_id = ?`,
        params
      );
   
      res.json({ message: 'Challenge updated' });
    } catch (err) {
      console.error('Error updating challenge:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
   
  module.exports = router;

