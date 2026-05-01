const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');
 
const router = express.Router();
 
// ─────────────────────────────────────────────
// POST /api/orders
// Home Cook only.
// Body:
//   {
//     recipe_id: 5,
//     scaled_serving: 4,
//     total_price: 44.39,
//     items: [
//       { ingredient_id: 1, supplier_id: 3, purchased_quantity: 2, subtotal: 5.99 },
//       ...
//     ]
//   }
//
// Transaction:
//   1. INSERT Orders (status = 'Pending')
//   2. INSERT Fulfills_Item per item
//   3. UPDATE Stocks (deduct stock)
//
// Royalty trigger fires automatically when status later becomes 'Completed'.
// Challenge score: +1 per qualifying purchase.
// ─────────────────────────────────────────────
router.post('/', requireLogin, requireRole('Home_Cook'), async (req, res) => {
  const { recipe_id, scaled_serving, total_price, items } = req.body;
 
  if (!recipe_id || !scaled_serving || !total_price || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'validation',
      fields: {
        recipe_id: !recipe_id ? 'Required' : undefined,
        scaled_serving: !scaled_serving ? 'Required' : undefined,
        total_price: !total_price ? 'Required' : undefined,
        items: (!Array.isArray(items) || items.length === 0) ? 'At least one item required' : undefined,
      },
    });
  }
 
  for (const item of items) {
    if (!item.ingredient_id || !item.supplier_id || !item.purchased_quantity || !item.subtotal) {
      return res.status(400).json({
        error: 'Each item must have ingredient_id, supplier_id, purchased_quantity, and subtotal',
      });
    }
  }
 
  try {
    const [recipe] = await query(
      'SELECT recipe_id, status FROM Recipe WHERE recipe_id = ?',
      [recipe_id]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    if (recipe.status !== 'published') {
      return res.status(400).json({ error: 'Cannot order ingredients for an unpublished recipe' });
    }
 
    const orderId = await withTransaction(async (conn) => {
      const [orderResult] = await conn.execute(
        `INSERT INTO Orders (order_date, total_price, creator_id, recipe_id, scaled_serving, status)
         VALUES (NOW(), ?, ?, ?, ?, 'Pending')`,
        [total_price, req.user.id, recipe_id, scaled_serving]
      );
      const newOrderId = orderResult.insertId;
 
      for (const item of items) {
        const { ingredient_id, supplier_id, purchased_quantity, subtotal } = item;
 
        const [stockRow] = await conn.execute(
          'SELECT current_stock FROM Stocks WHERE supplier_id = ? AND ingredient_id = ? FOR UPDATE',
          [supplier_id, ingredient_id]
        );
        if (!stockRow) {
          throw new Error(`Supplier ${supplier_id} does not stock ingredient ${ingredient_id}`);
        }
        if (stockRow.current_stock < purchased_quantity) {
          throw new Error(
            `Insufficient stock for ingredient ${ingredient_id} at supplier ${supplier_id}. ` +
            `Available: ${stockRow.current_stock}, Requested: ${purchased_quantity}`
          );
        }
 
        await conn.execute(
          `INSERT INTO Fulfills_Item (order_id, ingredient_id, supplier_id, purchased_quantity, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [newOrderId, ingredient_id, supplier_id, purchased_quantity, subtotal]
        );
 
        await conn.execute(
          'UPDATE Stocks SET current_stock = current_stock - ? WHERE supplier_id = ? AND ingredient_id = ?',
          [purchased_quantity, supplier_id, ingredient_id]
        );
      }
 
      return newOrderId;
    });
 
    // +1 challenge score for qualifying purchase (non-fatal)
    await awardChallengeScore(req.user.id, recipe_id, 1);
 
    res.status(201).json({ order_id: orderId, status: 'Pending', message: 'Order placed successfully' });
  } catch (err) {
    console.error('Error placing order:', err);
    if (err.message.startsWith('Insufficient stock') || err.message.startsWith('Supplier')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
 
// ─────────────────────────────────────────────
// GET /api/orders/supplier
// SQL: SELECT o.*, fi.* FROM Fulfills_Item fi JOIN Orders o WHERE fi.supplier_id = ?
// ─────────────────────────────────────────────
router.get('/supplier', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    try {
      const orders = await query(
        `SELECT DISTINCT o.order_id, o.order_date, o.total_price, o.status, o.scaled_serving,
                r.title AS recipe_title, u.UserName AS customer_name
         FROM Fulfills_Item fi
         JOIN Orders o ON fi.order_id = o.order_id
         JOIN Recipe r ON o.recipe_id = r.recipe_id
         JOIN User u ON o.creator_id = u.user_id
         WHERE fi.supplier_id = ?
         ORDER BY o.order_date DESC`,
        [req.user.id]
      );
      res.json(orders);
    } catch (err) {
      console.error('Error fetching supplier orders:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// GET /api/orders/supplier
// SQL: SELECT o.*, fi.* FROM Fulfills_Item fi JOIN Orders o WHERE fi.supplier_id = ?
// ─────────────────────────────────────────────
router.get('/supplier', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    try {
      const orders = await query(
        `SELECT DISTINCT o.order_id, o.order_date, o.total_price, o.status, o.scaled_serving,
                r.title AS recipe_title, u.UserName AS customer_name
         FROM Fulfills_Item fi
         JOIN Orders o ON fi.order_id = o.order_id
         JOIN Recipe r ON o.recipe_id = r.recipe_id
         JOIN User u ON o.creator_id = u.user_id
         WHERE fi.supplier_id = ?
         ORDER BY o.order_date DESC`,
        [req.user.id]
      );
      res.json(orders);
    } catch (err) {
      console.error('Error fetching supplier orders:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// PATCH /api/orders/:id/status
// Supplier only. Flow: Pending → Confirmed → Ready → Completed | Pending → Declined
// 'Completed' fires trg_update_royalty_on_order automatically.
// 'Declined' restores stock for this supplier's items.
// SQL: UPDATE Orders SET status = ? WHERE order_id = ?
// ─────────────────────────────────────────────
router.patch('/:id/status', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });
   
    const { status } = req.body;
    const ALLOWED = ['Confirmed', 'Ready', 'Completed', 'Declined'];
    if (!status || !ALLOWED.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED.join(', ')}` });
    }
   
    try {
      const [inv] = await query(
        'SELECT COUNT(*) AS cnt FROM Fulfills_Item WHERE order_id = ? AND supplier_id = ?',
        [orderId, req.user.id]
      );
      if (!inv || inv.cnt === 0) return res.status(403).json({ error: 'You are not a supplier for this order' });
   
      const [order] = await query('SELECT status FROM Orders WHERE order_id = ?', [orderId]);
      if (!order) return res.status(404).json({ error: 'Order not found' });
   
      if (status === 'Declined') {
        await withTransaction(async (conn) => {
          await conn.execute("UPDATE Orders SET status = 'Declined' WHERE order_id = ?", [orderId]);
          const items = await query(
            'SELECT ingredient_id, purchased_quantity FROM Fulfills_Item WHERE order_id = ? AND supplier_id = ?',
            [orderId, req.user.id]
          );
          for (const item of items) {
            await conn.execute(
              'UPDATE Stocks SET current_stock = current_stock + ? WHERE supplier_id = ? AND ingredient_id = ?',
              [item.purchased_quantity, req.user.id, item.ingredient_id]
            );
          }
        });
      } else {
        await query('UPDATE Orders SET status = ? WHERE order_id = ?', [status, orderId]);
      }
   
      res.json({ order_id: orderId, status, message: 'Order status updated' });
    } catch (err) {
      console.error('Error updating order status:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// GET /api/orders/:id
// SQL: SELECT * FROM Orders JOIN Recipe + SELECT * FROM Fulfills_Item JOIN Ingredient JOIN Local_Supplier
// ─────────────────────────────────────────────
router.get('/:id', requireLogin, async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });
   
    try {
      const [order] = await query(
        `SELECT o.order_id, o.order_date, o.total_price, o.status, o.scaled_serving,
                o.creator_id, r.recipe_id, r.title AS recipe_title,
                u.UserName AS customer_name
         FROM Orders o
         JOIN Recipe r ON o.recipe_id = r.recipe_id
         JOIN User u ON o.creator_id = u.user_id
         WHERE o.order_id = ?`,
        [orderId]
      );
      if (!order) return res.status(404).json({ error: 'Order not found' });
   
      const isCreator = req.user.id === order.creator_id;
      if (!isCreator) {
        const [inv] = await query(
          'SELECT COUNT(*) AS cnt FROM Fulfills_Item WHERE order_id = ? AND supplier_id = ?',
          [orderId, req.user.id]
        );
        if (!inv || inv.cnt === 0) return res.status(403).json({ error: 'Forbidden' });
      }
   
      const items = await query(
        `SELECT fi.ingredient_id, i.name AS ingredient_name,
                fi.supplier_id, ls.business_name AS supplier_name,
                fi.purchased_quantity, fi.subtotal, s.unit
         FROM Fulfills_Item fi
         JOIN Ingredient i ON fi.ingredient_id = i.ingredient_id
         JOIN Local_Supplier ls ON fi.supplier_id = ls.user_id
         LEFT JOIN Stocks s ON fi.supplier_id = s.supplier_id AND fi.ingredient_id = s.ingredient_id
         WHERE fi.order_id = ?`,
        [orderId]
      );
   
      res.json({ ...order, items });
    } catch (err) {
      console.error('Error fetching order:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// awardChallengeScore (internal helper)
// Called after a cook log (+1) or Shop This Meal purchase (+1).
// Finds active challenges whose required_tag is on the recipe,
// and increments score for the user's 'In Progress' participation rows.
// Exported so B20 (cook-log route) can also call it with points=1.
// ─────────────────────────────────────────────
async function awardChallengeScore(userId, recipeId, points) {
    try {
      const challenges = await query(
        `SELECT pi.challenge_id
         FROM Participates_in pi
         JOIN Kitchen_Challenge kc ON pi.challenge_id = kc.challenge_id
         JOIN Has_Tag ht ON ht.recipe_id = ? AND ht.tag_id = kc.required_tag_id
         WHERE pi.user_id = ?
           AND pi.progress_status = 'In Progress'
           AND kc.end_date >= CURDATE()`,
        [recipeId, userId]
      );
      for (const row of challenges) {
        await query(
          'UPDATE Participates_in SET score = score + ? WHERE user_id = ? AND challenge_id = ?',
          [points, userId, row.challenge_id]
        );
      }
    } catch (err) {
      console.error('awardChallengeScore error (non-fatal):', err.message);
    }
  }
   
  module.exports = router;
  module.exports.awardChallengeScore = awardChallengeScore;
   