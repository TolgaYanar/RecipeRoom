const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../utils/db');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await query(
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

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        user_type: user.user_type,
        username: user.UserName,
        email: user.Email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        user_id: user.user_id,
        username: user.UserName,
        email: user.Email,
        user_type: user.user_type,
      },
      token,
    });
  } catch (err) {
    throw err;
  }
});

// REGISTER HOME COOK
router.post('/register/home-cook', async (req, res) => {
  try {
    const { username, email, password, target_daily_calories, primary_diet_goal } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await withTransaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO User (UserName, Email, passwordHash, join_date)
         VALUES (?, ?, ?, NOW())`,
        [username, email, hashedPassword]
      );

      const userId = insertResult.insertId;

      await conn.execute(
        `INSERT INTO Home_Cook (user_id, balances, target_daily_calories, primary_diet_goal)
         VALUES (?, 0, ?, ?)`,
        [userId, target_daily_calories || null, primary_diet_goal || null]
      );

      return userId;
    });

    const token = jwt.sign(
      {
        user_id: result,
        user_type: 'Home_Cook',
        username,
        email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        user_id: result,
        username,
        email,
        user_type: 'Home_Cook',
      },
      token,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

// REGISTER VERIFIED CHEF
router.post('/register/chef', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await withTransaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO User (UserName, Email, passwordHash, join_date)
         VALUES (?, ?, ?, NOW())`,
        [username, email, hashedPassword]
      );

      const userId = insertResult.insertId;

      await conn.execute(
        `INSERT INTO Verified_Chef (user_id, verification_date, royalty_points)
         VALUES (?, CURDATE(), 0)`,
        [userId]
      );

      return userId;
    });

    const token = jwt.sign(
      {
        user_id: result,
        user_type: 'Verified_Chef',
        username,
        email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        user_id: result,
        username,
        email,
        user_type: 'Verified_Chef',
      },
      token,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

// REGISTER LOCAL SUPPLIER
router.post('/register/supplier', async (req, res) => {
  try {
    const { username, email, password, business_name, address, contact_number } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await withTransaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO User (UserName, Email, passwordHash, join_date)
         VALUES (?, ?, ?, NOW())`,
        [username, email, hashedPassword]
      );

      const userId = insertResult.insertId;

      await conn.execute(
        `INSERT INTO Local_Supplier (user_id, business_name, address, contact_number)
         VALUES (?, ?, ?, ?)`,
        [userId, business_name, address, contact_number]
      );

      return userId;
    });

    const token = jwt.sign(
      {
        user_id: result,
        user_type: 'Local_Supplier',
        username,
        email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        user_id: result,
        username,
        email,
        user_type: 'Local_Supplier',
      },
      token,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email or business info already exists' });
    }
    throw err;
  }
});

// REGISTER ADMIN
router.post('/register/admin', async (req, res) => {
  try {
    const { username, email, password, admin_level } = req.body;

    const result = await withTransaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO User (UserName, Email, passwordHash, join_date)
         VALUES (?, ?, ?, NOW())`,
        [username, email, password]
      );

      const userId = insertResult.insertId;

      await conn.execute(
        `INSERT INTO Administrator (user_id, admin_level)
         VALUES (?, ?)`,
        [userId, admin_level]
      );

      return userId;
    });

    const token = jwt.sign(
      {
        user_id: result,
        user_type: 'Administrator',
        username,
        email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        user_id: result,
        username,
        email,
        user_type: 'Administrator',
      },
      token,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

// GET ME
const { requireLogin } = require('../middleware/auth');
router.get('/me', requireLogin, (req, res) => {
  res.json({
    user: {
      user_id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      user_type: req.user.user_type,
    },
  });
});

module.exports = router;
