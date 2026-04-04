const express = require('express');
const router = express.Router();
const pool = require('../db');

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      `SELECT u.user_id, u.UserName, u.Email, u.passwordHash,
              CASE
                  WHEN a.user_id IS NOT NULL THEN 'Administrator'
                  WHEN vc.user_id IS NOT NULL THEN 'Verified_Chef'
                  WHEN ls.user_id IS NOT NULL THEN 'Local_Supplier'
                  WHEN hc.user_id IS NOT NULL THEN 'Home_Cook'
              END AS user_type
       FROM User u
              LEFT JOIN Administrator a ON u.user_id = a.user_id
              LEFT JOIN Verified_Chef vc ON u.user_id = vc.user_id
              LEFT JOIN Local_Supplier ls ON u.user_id = ls.user_id
              LEFT JOIN Home_Cook hc ON u.user_id = hc.user_id
       WHERE u.Email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.passwordHash !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      user_id: user.user_id,
      username: user.UserName,
      email: user.Email,
      user_type: user.user_type
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REGISTER HOME COOK
router.post('/register/home-cook', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, email, password, target_daily_calories, primary_diet_goal } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO User (UserName, Email, passwordHash, join_date)
       VALUES (?, ?, ?, NOW())`,
      [username, email, password]
    );

    const userId = result.insertId;

    await conn.query(
      `INSERT INTO Home_Cook (user_id, balances, target_daily_calories, primary_diet_goal)
       VALUES (?, 0, ?, ?)`,
      [userId, target_daily_calories || null, primary_diet_goal || null]
    );

    await conn.commit();
    res.status(201).json({ user_id: userId, user_type: 'Home_Cook' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// REGISTER VERIFIED CHEF
router.post('/register/chef', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, email, password } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO User (UserName, Email, passwordHash, join_date)
       VALUES (?, ?, ?, NOW())`,
      [username, email, password]
    );

    const userId = result.insertId;

    await conn.query(
      `INSERT INTO Verified_Chef (user_id, verification_date, royalty_points)
       VALUES (?, CURDATE(), 0)`,
      [userId]
    );

    await conn.commit();
    res.status(201).json({ user_id: userId, user_type: 'Verified_Chef' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// REGISTER LOCAL SUPPLIER
router.post('/register/supplier', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, email, password, business_name, address, contact_number } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO User (UserName, Email, passwordHash, join_date)
       VALUES (?, ?, ?, NOW())`,
      [username, email, password]
    );

    const userId = result.insertId;

    await conn.query(
      `INSERT INTO Local_Supplier (user_id, business_name, address, contact_number)
       VALUES (?, ?, ?, ?)`,
      [userId, business_name, address, contact_number]
    );

    await conn.commit();
    res.status(201).json({ user_id: userId, user_type: 'Local_Supplier' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email or business info already exists' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// REGISTER ADMIN
router.post('/register/admin', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, email, password, admin_level } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO User (UserName, Email, passwordHash, join_date)
       VALUES (?, ?, ?, NOW())`,
      [username, email, password]
    );

    const userId = result.insertId;

    await conn.query(
      `INSERT INTO Administrator (user_id, admin_level)
       VALUES (?, ?)`,
      [userId, admin_level]
    );

    await conn.commit();
    res.status(201).json({ user_id: userId, user_type: 'Administrator' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
