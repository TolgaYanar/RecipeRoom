const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');
const { hasEnough, convert } = require('../utils/units');
 
const router = express.Router();
const DELIVERY_FEE_PER_SUPPLIER = 2.49;
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
//   1. INSERT Orders 
//   2. INSERT Fulfills_Item per item
//   3. UPDATE Stocks (deduct stock)
//
// Royalty trigger fires automatically when order is inserted.
// Challenge score: +1 per qualifying purchase.
// ─────────────────────────────────────────────
router.post('/', requireLogin, requireRole('Home_Cook'), async (req, res) => {
  const { recipe_id, scaled_serving, total_price, items, delivery_address, delivery_notes } = req.body;

  if (!recipe_id || !scaled_serving || !total_price || !Array.isArray(items) || items.length === 0 || !delivery_address) {
    return res.status(400).json({
      error: 'validation',
      fields: {
        recipe_id: !recipe_id ? 'Required' : undefined,
        scaled_serving: !scaled_serving ? 'Required' : undefined,
        total_price: !total_price ? 'Required' : undefined,
        items: (!Array.isArray(items) || items.length === 0) ? 'At least one item required' : undefined,
        delivery_address: !delivery_address ? 'Required' : undefined,
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

    const distinctSuppliers = new Set(items.map((it) => it.supplier_id)).size;
    const deliveryFee = distinctSuppliers * DELIVERY_FEE_PER_SUPPLIER;

    const orderId = await withTransaction(async (conn) => {
      const grandTotal = Number(total_price) + deliveryFee;
      const [[cook]] = await conn.execute(
        'SELECT balances FROM Home_Cook WHERE user_id = ? FOR UPDATE',
        [req.user.id]
      );
      if (Number(cook.balances) < grandTotal) {
        throw new Error(`Insufficient balance. Available: ${cook.balances}, Required: ${grandTotal}`);
      }

      // Recipe's expected unit per ingredient — purchased_quantity from the
      // client comes in this unit, while Stocks may use a different one
      // (e.g. supplier sells kg, recipe asks g).
      const [reqUnitRows] = await conn.execute(
        'SELECT ingredient_id, unit FROM Requires WHERE recipe_id = ?',
        [recipe_id]
      );
      const recipeUnitMap = new Map(reqUnitRows.map((r) => [r.ingredient_id, r.unit]));

      const [orderResult] = await conn.execute(
        `INSERT INTO Orders (order_date, total_price, creator_id, recipe_id, scaled_serving, delivery_address, delivery_notes)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?)`,
        [total_price, req.user.id, recipe_id, scaled_serving, delivery_address, delivery_notes ?? null]
      );
      const newOrderId = orderResult.insertId;

      for (const item of items) {
        const { ingredient_id, supplier_id, purchased_quantity, subtotal } = item;

        const [[stockRow]] = await conn.execute(
          `SELECT s.current_stock, s.unit, i.name AS ingredient_name, ls.business_name AS supplier_name
           FROM Stocks s
           JOIN Ingredient i ON s.ingredient_id = i.ingredient_id
           JOIN Local_Supplier ls ON s.supplier_id = ls.user_id
           WHERE s.supplier_id = ? AND s.ingredient_id = ? FOR UPDATE`,
          [supplier_id, ingredient_id]
        );
        if (!stockRow) {
          throw new Error(`Supplier ${supplier_id} does not stock ingredient ${ingredient_id}`);
        }

        // Trust the unit the cart sent (which mirrors what the picker
        // displayed); if absent, fall back to the recipe's Requires entry
        // and only then to the supplier's own unit. This matters for
        // substitutes — Requires only knows the original ingredient.
        const recipeUnit = item.unit ?? recipeUnitMap.get(ingredient_id) ?? stockRow.unit;
        const stockUnit  = stockRow.unit;
        const qtyInStockUnit = convert(purchased_quantity, recipeUnit, stockUnit);

        if (qtyInStockUnit == null) {
          throw new Error(
            `Cannot reconcile units for ${stockRow.ingredient_name}: recipe uses ${recipeUnit}, ` +
            `${stockRow.supplier_name} sells in ${stockUnit}.`
          );
        }
        if (!hasEnough(stockRow.current_stock, stockUnit, purchased_quantity, recipeUnit)) {
          const ru = recipeUnit ?? '';
          const su = stockUnit ?? '';
          throw new Error(
            `Insufficient stock for ${stockRow.ingredient_name} at ${stockRow.supplier_name}. ` +
            `Available: ${stockRow.current_stock}${su}, Requested: ${purchased_quantity}${ru}`
          );
        }

        await conn.execute(
          `INSERT INTO Fulfills_Item (order_id, ingredient_id, supplier_id, purchased_quantity, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [newOrderId, ingredient_id, supplier_id, purchased_quantity, subtotal]
        );

        // Deduct in the supplier's own unit so we don't accidentally subtract
        // 150 (g) from a stock counted in kg.
        await conn.execute(
          'UPDATE Stocks SET current_stock = current_stock - ? WHERE supplier_id = ? AND ingredient_id = ?',
          [qtyInStockUnit, supplier_id, ingredient_id]
        );
      }

      // Credit each supplier their ingredient subtotal + one delivery fee
      // for the trip. Aggregating per supplier first avoids charging the
      // delivery fee per line.
      const perSupplier = new Map();
      for (const it of items) {
        const sid = it.supplier_id;
        perSupplier.set(sid, (perSupplier.get(sid) || 0) + Number(it.subtotal || 0));
      }
      for (const [sid, ingTotal] of perSupplier) {
        await conn.execute(
          'UPDATE Local_Supplier SET balance = balance + ? WHERE user_id = ?',
          [ingTotal + DELIVERY_FEE_PER_SUPPLIER, sid]
        );
      }

      await conn.execute(
        'UPDATE Home_Cook SET balances = balances - ? WHERE user_id = ?',
        [Number(total_price) + deliveryFee, req.user.id]
      );

      return newOrderId;
    });

    await awardChallengeScore(req.user.id, recipe_id, 1);

    res.status(201).json({
      order_id: orderId,
      ingredients_total: Number(total_price).toFixed(2),
      delivery_fee: deliveryFee.toFixed(2),
      delivery_fee_per_supplier: DELIVERY_FEE_PER_SUPPLIER,
      supplier_count: distinctSuppliers,
      grand_total: (Number(total_price) + deliveryFee).toFixed(2),
      message: 'Order placed successfully',
    });
  } catch (err) {
    console.error('Error placing order:', err);
    if (err.message.startsWith('Insufficient balance')) {
      return res.status(402).json({ error: err.message });
    }
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
        `SELECT o.order_id, o.order_date, o.scaled_serving,
                r.title AS recipe_title, u.UserName AS customer_name,
                COUNT(fi.ingredient_id) AS item_count,
                SUM (fi.subtotal) AS supplier_total
         FROM Fulfills_Item fi
         JOIN Orders o ON fi.order_id = o.order_id
         JOIN Recipe r ON o.recipe_id = r.recipe_id
         JOIN User u ON o.creator_id = u.user_id
         WHERE fi.supplier_id = ?
         GROUP BY o.order_id, o.order_date, o.scaled_serving,
                  r.title, u.UserName
         ORDER BY o.order_date DESC`,
        [req.user.id]
      );
      res.json(orders);
    } catch (err) {
      console.error('Error fetching supplier orders:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // GET /api/orders/mine — list the current user's orders.
// Defined before /:id since Express matches in registration order;
// appending after would let /:id swallow the "mine" segment.
router.get('/mine', requireLogin, async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.order_id, o.order_date, o.total_price, o.scaled_serving,
              o.delivery_address, o.delivery_notes,
              r.recipe_id, r.title AS recipe_title,
              (SELECT COUNT(*) FROM Fulfills_Item fi WHERE fi.order_id = o.order_id) AS item_count
       FROM Orders o
       JOIN Recipe r ON o.recipe_id = r.recipe_id
       WHERE o.creator_id = ?
       ORDER BY o.order_date DESC`,
      [req.user.id]
    );
    res.json(orders);
  } catch (err) {
    console.error('GET /orders/mine error:', err);
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
        `SELECT o.order_id, o.order_date, o.total_price, o.scaled_serving,
                o.creator_id, o.delivery_address, o.delivery_notes,
                r.recipe_id, r.title AS recipe_title,
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

      // Suppliers only see their own line items + their own slice of the total.
      // The cook (creator) sees the full order.
      const itemsSql =
        `SELECT fi.ingredient_id, i.name AS ingredient_name,
                fi.supplier_id, ls.business_name AS supplier_name,
                fi.purchased_quantity, fi.subtotal, s.unit
         FROM Fulfills_Item fi
         JOIN Ingredient i ON fi.ingredient_id = i.ingredient_id
         JOIN Local_Supplier ls ON fi.supplier_id = ls.user_id
         LEFT JOIN Stocks s ON fi.supplier_id = s.supplier_id AND fi.ingredient_id = s.ingredient_id
         WHERE fi.order_id = ?` + (isCreator ? '' : ' AND fi.supplier_id = ?');

      const items = await query(itemsSql, isCreator ? [orderId] : [orderId, req.user.id]);

      const response = { ...order, items };
      if (!isCreator) {
        response.supplier_total = items.reduce((s, it) => s + Number(it.subtotal || 0), 0);
        delete response.total_price;
      }
      res.json(response);
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
   