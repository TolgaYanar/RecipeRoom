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
  const { recipe_id, scaled_serving, total_price, items, delivery_address, delivery_notes, payment_method } = req.body;
  const payByCard = payment_method === 'card';

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

      // Card payments are accepted as cleared without touching the wallet —
      // there's no real payment processor in scope, so it's a placebo path.
      // Wallet payments still need a balance check + debit.
      if (!payByCard) {
        const [[cook]] = await conn.execute(
          'SELECT balances FROM Home_Cook WHERE user_id = ? FOR UPDATE',
          [req.user.id]
        );
        if (Number(cook.balances) < grandTotal) {
          throw new Error(`Insufficient balance. Available: ${cook.balances}, Required: ${grandTotal}`);
        }
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

      if (!payByCard) {
        await conn.execute(
          'UPDATE Home_Cook SET balances = balances - ? WHERE user_id = ?',
          [Number(total_price) + deliveryFee, req.user.id]
        );
      }

      // Anchor the lifecycle log with a placement event. Subsequent
      // events (cancel, ship, etc.) reference this same order.
      await conn.execute(
        `INSERT INTO Order_Events (order_id, supplier_id, event_type, actor_user_id, occurred_at)
         VALUES (?, NULL, 'placed', ?, NOW())`,
        [newOrderId, req.user.id]
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
                SUM (fi.subtotal) AS supplier_total,
                EXISTS (
                  SELECT 1 FROM Order_Events oe
                  WHERE oe.order_id = o.order_id
                    AND oe.supplier_id = fi.supplier_id
                    AND oe.event_type = 'cancelled'
                ) AS cancelled,
                EXISTS (
                  SELECT 1 FROM Order_Events oe
                  WHERE oe.order_id = o.order_id
                    AND oe.supplier_id = fi.supplier_id
                    AND oe.event_type = 'shipped'
                ) AS shipped
         FROM Fulfills_Item fi
         JOIN Orders o ON fi.order_id = o.order_id
         JOIN Recipe r ON o.recipe_id = r.recipe_id
         JOIN User u ON o.creator_id = u.user_id
         WHERE fi.supplier_id = ?
         GROUP BY o.order_id, o.order_date, o.scaled_serving,
                  r.title, u.UserName, fi.supplier_id
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
              (SELECT COUNT(*) FROM Fulfills_Item fi WHERE fi.order_id = o.order_id) AS item_count,
              (SELECT COUNT(DISTINCT fi.supplier_id) FROM Fulfills_Item fi
                 WHERE fi.order_id = o.order_id) AS supplier_count,
              (SELECT COUNT(DISTINCT supplier_id) FROM Order_Events
                 WHERE order_id = o.order_id AND event_type = 'cancelled') AS cancelled_supplier_count,
              (SELECT COALESCE(SUM(fi.subtotal), 0) FROM Fulfills_Item fi
                 WHERE fi.order_id = o.order_id
                   AND fi.supplier_id IN (
                     SELECT supplier_id FROM Order_Events
                     WHERE order_id = o.order_id AND event_type = 'cancelled'
                   )) AS cancelled_subtotal,
              (SELECT COUNT(DISTINCT supplier_id) FROM Order_Events
                 WHERE order_id = o.order_id AND event_type = 'shipped') AS shipped_supplier_count,
              (SELECT occurred_at FROM Order_Events
                 WHERE order_id = o.order_id AND event_type = 'delivered'
                 ORDER BY occurred_at DESC LIMIT 1) AS delivered_at,
              (SELECT occurred_at FROM Order_Events
                 WHERE order_id = o.order_id AND event_type = 'reviewed'
                 ORDER BY occurred_at DESC LIMIT 1) AS reviewed_at
       FROM Orders o
       JOIN Recipe r ON o.recipe_id = r.recipe_id
       WHERE o.creator_id = ?
       ORDER BY o.order_date DESC`,
      [req.user.id]
    );

    // Total refunded = cancelled-line subtotals + one delivery fee per
    // cancelled supplier. Computed in JS so the fee constant stays in
    // one place.
    for (const o of orders) {
      const fees = Number(o.cancelled_supplier_count || 0) * DELIVERY_FEE_PER_SUPPLIER;
      o.refunded_amount = Number(o.cancelled_subtotal || 0) + fees;
    }
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
      // purchased_quantity is in the recipe's unit, so we surface req.unit
      // when the line maps to a recipe-required ingredient and fall back
      // to Stocks.unit only for substitute ingredients (no Requires row).
      const itemsSql =
        `SELECT fi.ingredient_id, i.name AS ingredient_name,
                fi.supplier_id, ls.business_name AS supplier_name,
                fi.purchased_quantity, fi.subtotal,
                COALESCE(req.unit, s.unit) AS unit
         FROM Fulfills_Item fi
         JOIN Ingredient i ON fi.ingredient_id = i.ingredient_id
         JOIN Local_Supplier ls ON fi.supplier_id = ls.user_id
         LEFT JOIN Stocks s ON fi.supplier_id = s.supplier_id AND fi.ingredient_id = s.ingredient_id
         LEFT JOIN Requires req ON req.recipe_id = ? AND req.ingredient_id = fi.ingredient_id
         WHERE fi.order_id = ?` + (isCreator ? '' : ' AND fi.supplier_id = ?');

      const items = await query(
        itemsSql,
        isCreator ? [order.recipe_id, orderId] : [order.recipe_id, orderId, req.user.id]
      );

      // Lifecycle events. Suppliers only see events scoped to them or
      // to the order as a whole (no supplier_id) — keeps other suppliers'
      // cancellations private.
      const eventsSql = isCreator
        ? `SELECT event_id, supplier_id, event_type, actor_user_id, notes, occurred_at,
                  ls.business_name AS supplier_name
           FROM Order_Events oe
           LEFT JOIN Local_Supplier ls ON oe.supplier_id = ls.user_id
           WHERE oe.order_id = ?
           ORDER BY occurred_at ASC, event_id ASC`
        : `SELECT event_id, supplier_id, event_type, actor_user_id, notes, occurred_at,
                  ls.business_name AS supplier_name
           FROM Order_Events oe
           LEFT JOIN Local_Supplier ls ON oe.supplier_id = ls.user_id
           WHERE oe.order_id = ? AND (oe.supplier_id IS NULL OR oe.supplier_id = ?)
           ORDER BY occurred_at ASC, event_id ASC`;
      const events = await query(eventsSql, isCreator ? [orderId] : [orderId, req.user.id]);

      const response = { ...order, items, events };
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

// POST /api/orders/:id/cancel
// Supplier-only. Cancels every Fulfills_Item line this supplier owns
// in the order: refunds the cook (their slice + the per-supplier
// delivery fee), debits the supplier's wallet, restores stock in the
// supplier's stocking unit, and records a 'cancelled' event.
router.post('/:id/cancel', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });
  const supplierId = req.user.id;
  const { notes } = req.body || {};

  try {
    const result = await withTransaction(async (conn) => {
      const [[order]] = await conn.execute(
        'SELECT order_id, creator_id FROM Orders WHERE order_id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order not found');

      const [lines] = await conn.execute(
        `SELECT fi.ingredient_id, fi.purchased_quantity, fi.subtotal,
                s.unit AS stock_unit, req.unit AS recipe_unit
         FROM Fulfills_Item fi
         LEFT JOIN Stocks s ON fi.supplier_id = s.supplier_id AND fi.ingredient_id = s.ingredient_id
         LEFT JOIN Requires req ON fi.ingredient_id = req.ingredient_id AND req.recipe_id = (
           SELECT recipe_id FROM Orders WHERE order_id = ?
         )
         WHERE fi.order_id = ? AND fi.supplier_id = ?`,
        [orderId, orderId, supplierId]
      );
      if (lines.length === 0) throw new Error('No lines for this supplier in this order');

      // Lifecycle guard: a supplier can only cancel before they've
      // shipped, and before the cook marked the whole order delivered.
      const [[blockingEvent]] = await conn.execute(
        `SELECT event_type FROM Order_Events
         WHERE order_id = ?
           AND (
             (supplier_id = ? AND event_type IN ('shipped','cancelled'))
             OR (event_type = 'delivered')
           )
         LIMIT 1`,
        [orderId, supplierId]
      );
      if (blockingEvent) {
        if (blockingEvent.event_type === 'cancelled') throw new Error('Already cancelled');
        if (blockingEvent.event_type === 'shipped')   throw new Error('Already shipped — cannot cancel after dispatch');
        if (blockingEvent.event_type === 'delivered') throw new Error('Order already delivered — cannot cancel');
      }

      const subtotal = lines.reduce((s, l) => s + Number(l.subtotal || 0), 0);
      const refund   = subtotal + DELIVERY_FEE_PER_SUPPLIER;

      await conn.execute(
        'UPDATE Home_Cook SET balances = balances + ? WHERE user_id = ?',
        [refund, order.creator_id]
      );
      await conn.execute(
        'UPDATE Local_Supplier SET balance = balance - ? WHERE user_id = ?',
        [refund, supplierId]
      );

      // Restore stock in the supplier's own unit (purchased_quantity is
      // stored in the recipe's unit so it needs converting back).
      for (const line of lines) {
        const recipeUnit = line.recipe_unit ?? line.stock_unit;
        const stockUnit  = line.stock_unit ?? recipeUnit;
        const restored   = convert(line.purchased_quantity, recipeUnit, stockUnit) ?? line.purchased_quantity;
        await conn.execute(
          'UPDATE Stocks SET current_stock = current_stock + ? WHERE supplier_id = ? AND ingredient_id = ?',
          [restored, supplierId, line.ingredient_id]
        );
      }

      await conn.execute(
        `INSERT INTO Order_Events (order_id, supplier_id, event_type, actor_user_id, notes, occurred_at)
         VALUES (?, ?, 'cancelled', ?, ?, NOW())`,
        [orderId, supplierId, supplierId, notes ?? null]
      );

      return { refund, lineCount: lines.length };
    });

    res.json({
      message: 'Order line cancelled',
      refunded: result.refund.toFixed(2),
      lines_cancelled: result.lineCount,
    });
  } catch (err) {
    console.error('Error cancelling order line:', err);
    if (err.message === 'Order not found') return res.status(404).json({ error: err.message });
    if (err.message === 'No lines for this supplier in this order') return res.status(403).json({ error: err.message });
    if (err.message === 'Already cancelled' ||
        err.message.startsWith('Already shipped') ||
        err.message.startsWith('Order already delivered')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/ship
// Supplier marks their portion of the order as shipped. Records a
// supplier-scoped 'shipped' event. Cancelled lines can't be shipped,
// and one shipped event per supplier per order is the cap.
router.post('/:id/ship', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });
  const supplierId = req.user.id;

  try {
    const [[lineCheck]] = await query(
      'SELECT COUNT(*) AS cnt FROM Fulfills_Item WHERE order_id = ? AND supplier_id = ?',
      [orderId, supplierId]
    ).then((r) => [r]);
    if (!lineCheck || lineCheck.cnt === 0) {
      return res.status(403).json({ error: 'No lines for this supplier in this order' });
    }

    const [existing] = await query(
      `SELECT event_type FROM Order_Events
       WHERE order_id = ?
         AND (
           (supplier_id = ? AND event_type IN ('shipped','cancelled'))
           OR event_type = 'delivered'
         )
       LIMIT 1`,
      [orderId, supplierId]
    );
    if (existing) {
      if (existing.event_type === 'delivered') {
        return res.status(409).json({ error: 'Order already delivered — cannot ship' });
      }
      return res.status(409).json({ error: `Already ${existing.event_type}` });
    }

    await query(
      `INSERT INTO Order_Events (order_id, supplier_id, event_type, actor_user_id, occurred_at)
       VALUES (?, ?, 'shipped', ?, NOW())`,
      [orderId, supplierId, supplierId]
    );
    res.json({ message: 'Marked shipped' });
  } catch (err) {
    console.error('Error marking shipped:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/receive
// Cook confirms the whole order arrived. Records a 'delivered' event
// scoped to the order (no supplier_id). Time-derived "delivered" still
// kicks in after the 3-day SLA if the cook never clicks.
router.post('/:id/receive', requireLogin, requireRole('Home_Cook'), async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });

  try {
    const [order] = await query(
      'SELECT order_id, creator_id FROM Orders WHERE order_id = ?',
      [orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.creator_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const [existing] = await query(
      `SELECT event_id FROM Order_Events
       WHERE order_id = ? AND event_type = 'delivered'`,
      [orderId]
    );
    if (existing) return res.status(409).json({ error: 'Already marked delivered' });

    await query(
      `INSERT INTO Order_Events (order_id, supplier_id, event_type, actor_user_id, occurred_at)
       VALUES (?, NULL, 'delivered', ?, NOW())`,
      [orderId, req.user.id]
    );
    res.json({ message: 'Marked delivered' });
  } catch (err) {
    console.error('Error marking delivered:', err);
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
   