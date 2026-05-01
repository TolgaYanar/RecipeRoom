const express = require('express');
const { query } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');
 
const router = express.Router();
 
// ─────────────────────────────────────────────
// GET /api/suppliers/stock-status
// Public. Reads entire Supplier_Stock_Status view.
// SQL: SELECT * FROM Supplier_Stock_Status
// ─────────────────────────────────────────────
router.get('/stock-status', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM Supplier_Stock_Status ORDER BY supplier_id, ingredient_name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching stock status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/suppliers/inventory
// Supplier adds a new ingredient to their stock (Stocks table).
// Body: { ingredient_id, price_per_unit, current_stock, unit? }
// SQL: INSERT INTO Stocks ...
// ─────────────────────────────────────────────
router.post('/inventory', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    const { ingredient_id, price_per_unit, current_stock, unit } = req.body;
   
    if (!ingredient_id || price_per_unit === undefined || current_stock === undefined) {
      return res.status(400).json({
        error: 'validation',
        fields: {
          ingredient_id: !ingredient_id ? 'Required' : undefined,
          price_per_unit: price_per_unit === undefined ? 'Required' : undefined,
          current_stock: current_stock === undefined ? 'Required' : undefined,
        },
      });
    }
    if (price_per_unit <= 0) return res.status(400).json({ error: 'price_per_unit must be > 0' });
    if (current_stock < 0) return res.status(400).json({ error: 'current_stock cannot be negative' });
   
    try {
      const [ingredient] = await query(
        'SELECT ingredient_id FROM Ingredient WHERE ingredient_id = ?',
        [ingredient_id]
      );
      if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
   
      await query(
        'INSERT INTO Stocks (supplier_id, ingredient_id, price_per_unit, current_stock, unit) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, ingredient_id, price_per_unit, current_stock, unit || null]
      );
   
      res.status(201).json({ message: 'Ingredient added to inventory' });
    } catch (err) {
      console.error('Error adding inventory:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'You already stock this ingredient. Use PATCH to update.' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// PATCH /api/suppliers/inventory/:id
// :id = ingredient_id. Supplier updates price and/or stock for one of their ingredients.
// Body: { price_per_unit?, current_stock?, unit? }
// SQL: UPDATE Stocks SET price_per_unit = ?, current_stock = ? WHERE supplier_id = ? AND ingredient_id = ?
// ─────────────────────────────────────────────
router.patch('/inventory/:id', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    const ingredientId = parseInt(req.params.id);
    if (isNaN(ingredientId)) return res.status(400).json({ error: 'Invalid ingredient ID' });
   
    const { price_per_unit, current_stock, unit } = req.body;
   
    if (price_per_unit === undefined && current_stock === undefined && unit === undefined) {
      return res.status(400).json({ error: 'Provide at least one of: price_per_unit, current_stock, unit' });
    }
    if (price_per_unit !== undefined && price_per_unit <= 0) {
      return res.status(400).json({ error: 'price_per_unit must be > 0' });
    }
    if (current_stock !== undefined && current_stock < 0) {
      return res.status(400).json({ error: 'current_stock cannot be negative' });
    }
   
    try {
      const [existing] = await query(
        'SELECT supplier_id FROM Stocks WHERE supplier_id = ? AND ingredient_id = ?',
        [req.user.id, ingredientId]
      );
      if (!existing) return res.status(404).json({ error: 'Ingredient not found in your inventory' });
   
      const setClauses = [];
      const params = [];
      if (price_per_unit !== undefined) { setClauses.push('price_per_unit = ?'); params.push(price_per_unit); }
      if (current_stock !== undefined) { setClauses.push('current_stock = ?'); params.push(current_stock); }
      if (unit !== undefined) { setClauses.push('unit = ?'); params.push(unit); }
      params.push(req.user.id, ingredientId);
   
      await query(
        `UPDATE Stocks SET ${setClauses.join(', ')} WHERE supplier_id = ? AND ingredient_id = ?`,
        params
      );
   
      res.json({ message: 'Inventory updated' });
    } catch (err) {
      console.error('Error updating inventory:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// ─────────────────────────────────────────────
// DELETE /api/suppliers/inventory/:id
// :id = ingredient_id. Supplier removes ingredient from stock.
// Blocked if there are open (non-Completed, non-Declined) orders for this item.
// SQL: DELETE FROM Stocks WHERE supplier_id = ? AND ingredient_id = ?
// ─────────────────────────────────────────────
router.delete('/inventory/:id', requireLogin, requireRole('Local_Supplier'), async (req, res) => {
    const ingredientId = parseInt(req.params.id);
    if (isNaN(ingredientId)) return res.status(400).json({ error: 'Invalid ingredient ID' });
   
    try {
      const [openOrders] = await query(
        `SELECT COUNT(*) AS cnt
         FROM Fulfills_Item fi
         JOIN Orders o ON fi.order_id = o.order_id
         WHERE fi.supplier_id = ? AND fi.ingredient_id = ?
           AND o.status NOT IN ('Completed', 'Declined')`,
        [req.user.id, ingredientId]
      );
      if (openOrders.cnt > 0) {
        return res.status(409).json({
          error: 'Cannot remove ingredient with open orders. Complete or decline pending orders first.',
        });
      }
   
      const result = await query(
        'DELETE FROM Stocks WHERE supplier_id = ? AND ingredient_id = ?',
        [req.user.id, ingredientId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Ingredient not found in your inventory' });
      }
   
      res.json({ message: 'Ingredient removed from inventory' });
    } catch (err) {
      console.error('Error deleting inventory:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────
// GET /api/suppliers/:id/inventory
// Returns this supplier's stock list from Supplier_Stock_Status view + KPI counts.
// SQL: SELECT * FROM Supplier_Stock_Status WHERE supplier_id = ?
// ─────────────────────────────────────────────
router.get('/:id/inventory', requireLogin, async (req, res) => {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) return res.status(400).json({ error: 'Invalid supplier ID' });
   
    if (req.user.user_type !== 'Administrator' && req.user.id !== supplierId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
   
    try {
      const [supplier] = await query(
        'SELECT user_id, business_name, address, contact_number FROM Local_Supplier WHERE user_id = ?',
        [supplierId]
      );
      if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
   
      const inventory = await query(
        `SELECT ingredient_id, ingredient_name, generic_taxonomy_name,
                current_stock, price_per_unit, unit, stock_status
         FROM Supplier_Stock_Status
         WHERE supplier_id = ?
         ORDER BY ingredient_name`,
        [supplierId]
      );
   
      // Dashboard KPI aggregate (matches design report §3.4.5 supplier dashboard query)
      const [kpis] = await query(
        `SELECT
           COUNT(*) AS total_products,
           SUM(current_stock > 0) AS in_stock_count,
           SUM(current_stock * price_per_unit) AS inventory_value,
           SUM(current_stock < 30 AND current_stock > 0) AS low_stock_count,
           SUM(current_stock = 0) AS out_of_stock_count
         FROM Supplier_Stock_Status
         WHERE supplier_id = ?`,
        [supplierId]
      );
   
      res.json({ supplier, kpis, inventory });
    } catch (err) {
      console.error('Error fetching inventory:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
   
  module.exports = router;
   