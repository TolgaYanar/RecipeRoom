const express = require('express');
const { query, withTransaction } = require('../utils/db');
const { requireLogin, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/recipes
// Query params: q, cuisine, difficulty, cookingTime, page, limit
router.get('/', async (req, res) => {
  try {
    const {
      q, cuisine, difficulty, cookingTime,
      minRating, ingredient, category,
      page = 1, limit = 9,
    } = req.query;

    const offset = Math.floor((Number(page) - 1) * Number(limit));

    // WHERE conditions are created dynamically
    const conditions = ['1=1'];
    const params = [];

    if (q) {
      conditions.push('(rs.title LIKE ? OR rs.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (cuisine) {
      // checking couisine tag from has tag
      conditions.push(`EXISTS (
        SELECT 1 FROM Has_Tag ht2
        JOIN Tag t2 ON ht2.tag_id = t2.tag_id
        WHERE ht2.recipe_id = rs.recipe_id AND t2.tag_name = ?
      )`);
      params.push(cuisine);
    }
    if (difficulty) {
      conditions.push('rs.difficulty = ?');
      params.push(difficulty);
    }
    if (cookingTime === 'under-30') {
      conditions.push('rs.cooking_time < 30');
    } else if (cookingTime === '30-60') {
      conditions.push('rs.cooking_time BETWEEN 30 AND 60');
    } else if (cookingTime === 'over-60') {
      conditions.push('rs.cooking_time > 60');
    }
    if (minRating) {
      conditions.push('rs.avg_rating >= ?');
      params.push(Number(minRating));
    }
    if (ingredient) {
      conditions.push(`EXISTS (
        SELECT 1 FROM Requires req2
        JOIN Ingredient i2 ON req2.ingredient_id = i2.ingredient_id
        WHERE req2.recipe_id = rs.recipe_id
          AND i2.name LIKE ?
      )`);
      params.push(`%${ingredient}%`);
    }
    if (category) {
      conditions.push(`EXISTS (
        SELECT 1 FROM Has_Tag ht3
        JOIN Tag t3 ON ht3.tag_id = t3.tag_id
        WHERE ht3.recipe_id = rs.recipe_id AND t3.tag_name = ?
      )`);
      params.push(category);
    }

    const where = conditions.join(' AND ');

    // Total record count (for pagination)
const countRows = await query(
  `SELECT COUNT(*) AS total FROM Recipe_Summary rs WHERE ${where}`,
  params
);
const total = countRows[0].total;

    // actual data
const recipes = await query(
  `SELECT rs.* FROM Recipe_Summary rs
   WHERE ${where}
   ORDER BY rs.avg_rating DESC, rs.review_count DESC
   LIMIT ${Number(limit)} OFFSET ${offset}`,
  params
);

    res.json({
      items: recipes,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('GET /recipes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recipes/my
// only logged in users
router.get('/my', requireLogin, async (req, res) => {
  try {
    const recipes = await query(
      `SELECT * FROM Recipe_Summary
       WHERE recipe_id IN (
         SELECT recipe_id FROM Recipe
         WHERE publisher_home_cook_id = ? OR publisher_chef_id = ?
       )`,
      [req.user.id, req.user.id]
    );
    res.json(recipes);
  } catch (err) {
    console.error('GET /recipes/my error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    // basic info (from Recipe_Summary view)
    const [recipe] = await query(
      'SELECT * FROM Recipe_Summary WHERE recipe_id = ?',
      [recipeId]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Parent recipe info (fork)
    let parentRecipe = null;
    const [recipeRow] = await query(
      'SELECT parent_recipe_id, publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (recipeRow?.parent_recipe_id) {
      const [parent] = await query(
        'SELECT recipe_id, title FROM Recipe WHERE recipe_id = ?',
        [recipeRow.parent_recipe_id]
      );
      parentRecipe = parent || null;
    }

    // publisher_id — for frontend ownership check
    const publisherId = recipeRow?.publisher_home_cook_id ?? recipeRow?.publisher_chef_id ?? null;

    // ingredients
    const ingredients = await query(
      `SELECT i.ingredient_id, i.name, i.generic_taxonomy_name,
              req.quantity, req.unit,
              i.calories_per_unit, i.protein_g, i.carbs_g, i.fat_g
       FROM Requires req
       JOIN Ingredient i ON req.ingredient_id = i.ingredient_id
       WHERE req.recipe_id = ?`,
      [recipeId]
    );

    // Tags
    const tags = await query(
      `SELECT t.tag_id, t.tag_name
       FROM Has_Tag ht JOIN Tag t ON ht.tag_id = t.tag_id
       WHERE ht.recipe_id = ?`,
      [recipeId]
    );

    // Media
    const media = await query(
      `SELECT media_url AS url, media_type, is_thumbnail
       FROM Recipe_Media WHERE recipe_id = ?
       ORDER BY is_thumbnail DESC`,
      [recipeId]
    );

    // reviews
    const reviews = await query(
      `SELECT rr.score, rr.review_text AS body, rr.timestamp,
              u.UserName AS author, u.user_id
       FROM Rates_Review rr
       JOIN User u ON rr.user_id = u.user_id
       WHERE rr.recipe_id = ?
       ORDER BY rr.timestamp DESC`,
      [recipeId]
    );

    // allowedsubstitutions
    const substitutions = await query(
      `SELECT asub.original_item_id AS source_ingredient_id,
              i_orig.name AS source_ingredient_name,
              asub.substitute_item_id AS sub_ingredient_id,
              i_sub.name AS sub_ingredient_name,
              asub.quantity_multiplier
       FROM Allows_Substitution asub
       JOIN Ingredient i_orig ON asub.original_item_id = i_orig.ingredient_id
       JOIN Ingredient i_sub  ON asub.substitute_item_id = i_sub.ingredient_id
       WHERE asub.recipe_id = ?`,
      [recipeId]
    );

    res.json({
      ...recipe,
      publisher_id: publisherId,
      parent_recipe: parentRecipe,
      ingredients,
      tags,
      media,
      reviews,
      substitutions,
    });
  } catch (err) {
    console.error('GET /recipes/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST /api/recipes
router.post('/', requireLogin, requireRole('Home_Cook', 'Verified_Chef'), async (req, res) => {
  const {
    title, description, cooking_time, difficulty,
    servings, ingredients = [], steps = [], tags = [],
    image_url, substitutions = [],
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!cooking_time)   return res.status(400).json({ error: 'cooking_time is required' });

  try {
    const newId = await withTransaction(async (conn) => {
      // 1. add into recipe table
      const isChef = req.user.user_type === 'Verified_Chef';
      const [result] = await conn.execute(
        `INSERT INTO Recipe
           (title, description, cooking_time, difficulty, base_servings,
            publisher_home_cook_id, publisher_chef_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          title.trim(),
          description?.trim() || null,
          Number(cooking_time),
          difficulty || null,
          Number(servings) || 4,
          isChef ? null : req.user.id,
          isChef ? req.user.id : null,
        ]
      );
      const recipeId = result.insertId;

      // 2. add ingredients (Requires table)
      for (const ing of ingredients) {
        if (!ing.ingredient_id || !ing.quantity || !ing.unit) continue;
        await conn.execute(
          'INSERT INTO Requires (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
          [recipeId, ing.ingredient_id, Number(ing.quantity), ing.unit]
        );
      }

      // 3. add tags (Has_Tag table)
      for (const tagId of tags) {
        if (!tagId) continue;
        await conn.execute(
          'INSERT IGNORE INTO Has_Tag (recipe_id, tag_id) VALUES (?, ?)',
          [recipeId, tagId]
        );
      }

      // 4. if there is a main image, insert into Recipe_Media
      if (image_url?.trim()) {
        await conn.execute(
          `INSERT INTO Recipe_Media (media_url, media_type, is_thumbnail, recipe_id)
           VALUES (?, 'image', TRUE, ?)`,
          [image_url.trim(), recipeId]
        );
      }

      // 5. add ubstitutions
      for (const sub of substitutions) {
        if (!sub.source_ingredient_id || !sub.sub_ingredient_id) continue;
        if (sub.source_ingredient_id === sub.sub_ingredient_id) continue; // D04 trigger bunu zaten bloklar ama önlem
        await conn.execute(
          `INSERT IGNORE INTO Allows_Substitution
             (recipe_id, original_item_id, substitute_item_id, quantity_multiplier)
           VALUES (?, ?, ?, ?)`,
          [recipeId, sub.source_ingredient_id, sub.sub_ingredient_id, sub.quantity_multiplier || 1.0]
        );
      }

      return recipeId;
    });

    res.status(201).json({ id: newId, message: 'Recipe created' });
  } catch (err) {
    console.error('POST /recipes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireLogin, async (req, res) => {
  const recipeId = parseInt(req.params.id);
  if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid ID' });

  const { title, description, cooking_time, difficulty, servings } = req.body;

  try {
    // check if the user is the owner of the recipe
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await query(
      `UPDATE Recipe SET title = ?, description = ?, cooking_time = ?, difficulty = ?, base_servings = ?
       WHERE recipe_id = ?`,
      [title, description, cooking_time, difficulty, servings, recipeId]
    );
    res.json({ message: 'Recipe updated' });
  } catch (err) {
    console.error('PUT /recipes/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireLogin, async (req, res) => {
  const recipeId = parseInt(req.params.id);
  if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id && req.user.user_type !== 'Administrator') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('DELETE FROM Recipe WHERE recipe_id = ?', [recipeId]);
    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    console.error('DELETE /recipes/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/fork', requireLogin, requireRole('Home_Cook', 'Verified_Chef'), async (req, res) => {
  const parentId = parseInt(req.params.id);
  if (isNaN(parentId)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const [parent] = await query('SELECT * FROM Recipe WHERE recipe_id = ?', [parentId]);
    if (!parent) return res.status(404).json({ error: 'Recipe not found' });

    const newId = await withTransaction(async (conn) => {
      const isChef = req.user.user_type === 'Verified_Chef';
      const [result] = await conn.execute(
        `INSERT INTO Recipe
           (title, description, cooking_time, difficulty, base_servings,
            parent_recipe_id, publisher_home_cook_id, publisher_chef_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          `Fork of: ${parent.title}`,
          parent.description,
          parent.cooking_time,
          parent.difficulty,
          parent.base_servings,
          parentId,
          isChef ? null : req.user.id,
          isChef ? req.user.id : null,
        ]
      );
      const newRecipeId = result.insertId;

      // copy ingredients (Requires table)
      await conn.execute(
        `INSERT INTO Requires (recipe_id, ingredient_id, quantity, unit)
         SELECT ?, ingredient_id, quantity, unit FROM Requires WHERE recipe_id = ?`,
        [newRecipeId, parentId]
      );

      // copy tags (Has_Tag table)
      await conn.execute(
        `INSERT INTO Has_Tag (recipe_id, tag_id)
         SELECT ?, tag_id FROM Has_Tag WHERE recipe_id = ?`,
        [newRecipeId, parentId]
      );

      // copy substitutions (Allows_Substitution table)
      await conn.execute(
        `INSERT INTO Allows_Substitution (recipe_id, original_item_id, substitute_item_id, quantity_multiplier)
         SELECT ?, original_item_id, substitute_item_id, quantity_multiplier
         FROM Allows_Substitution WHERE recipe_id = ?`,
        [newRecipeId, parentId]
      );

      return newRecipeId;
    });

    res.status(201).json({ id: newId, message: 'Recipe forked' });
  } catch (err) {
    console.error('POST /recipes/:id/fork error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/publish', requireLogin, async (req, res) => {
  const recipeId = parseInt(req.params.id);
  if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await query("UPDATE Recipe SET status = 'published' WHERE recipe_id = ?", [recipeId]);
    res.json({ message: 'Recipe published' });
  } catch (err) {
    console.error('POST /recipes/:id/publish error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/performance', requireLogin, async (req, res) => {
  const recipeId = parseInt(req.params.id);
  if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const [rec] = await query(
      'SELECT publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });

    const cookLogCount = await query(
      'SELECT COUNT(*) AS cnt FROM Logs_Cook WHERE recipe_id = ?',
      [recipeId]
    );
    const orderCount = await query(
      "SELECT COUNT(*) AS cnt FROM Orders WHERE recipe_id = ? AND status = 'Completed'",
      [recipeId]
    );
    const [rating] = await query(
      'SELECT AVG(score) AS avg_rating, COUNT(*) AS review_count FROM Rates_Review WHERE recipe_id = ?',
      [recipeId]
    );

    let royaltyPoints = null;
    if (rec.publisher_chef_id) {
      const [chef] = await query(
        'SELECT royalty_points FROM Verified_Chef WHERE user_id = ?',
        [rec.publisher_chef_id]
      );
      royaltyPoints = chef?.royalty_points ?? 0;
    }

    res.json({
      recipe_id: recipeId,
      cook_log_count: cookLogCount[0].cnt,
      completed_orders: orderCount[0].cnt,
      avg_rating: rating?.avg_rating ? Number(rating.avg_rating).toFixed(1) : null,
      review_count: rating?.review_count ?? 0,
      royalty_points: royaltyPoints,
    });
  } catch (err) {
    console.error('GET /recipes/:id/performance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Recipe Media

// Get all media for a recipe
router.get('/:id/media', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const media = await query(
      `SELECT media_url AS url, media_type, is_thumbnail
       FROM Recipe_Media WHERE recipe_id = ?
       ORDER BY is_thumbnail DESC`,
      [recipeId]
    );

    res.json(media);
  } catch (err) {
    console.error('GET /recipes/:id/media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new media item to a recipe - author only
router.post('/:id/media', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const { url, media_type = 'image', is_thumbnail = false } = req.body;
    if (!url?.trim()) return res.status(400).json({ error: 'url is required' });

    // Verify ownership
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // If new item is thumbnail, clear existing thumbnail first
    if (is_thumbnail) {
      await query(
        'UPDATE Recipe_Media SET is_thumbnail = FALSE WHERE recipe_id = ?',
        [recipeId]
      );
    }

    await query(
      `INSERT INTO Recipe_Media (media_url, media_type, is_thumbnail, recipe_id)
       VALUES (?, ?, ?, ?)`,
      [url.trim(), media_type, is_thumbnail ? 1 : 0, recipeId]
    );

    res.status(201).json({ message: 'Media added' });
  } catch (err) {
    console.error('POST /recipes/:id/media error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Media URL already exists for this recipe' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a media item (toggle thumbnail) - author only
router.patch('/:id/media/:mediaUrl', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const mediaUrl = decodeURIComponent(req.params.mediaUrl);
    const { is_thumbnail } = req.body;

    // Verify ownership
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Only one thumbnail allowed per recipe
    if (is_thumbnail) {
      await query(
        'UPDATE Recipe_Media SET is_thumbnail = FALSE WHERE recipe_id = ?',
        [recipeId]
      );
    }

    await query(
      'UPDATE Recipe_Media SET is_thumbnail = ? WHERE media_url = ? AND recipe_id = ?',
      [is_thumbnail ? 1 : 0, mediaUrl, recipeId]
    );

    res.json({ message: 'Media updated' });
  } catch (err) {
    console.error('PATCH /recipes/:id/media/:mediaUrl error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a media item - author only, auto-promotes next item to thumbnail if needed
router.delete('/:id/media/:mediaUrl', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const mediaUrl = decodeURIComponent(req.params.mediaUrl);

    // Verify ownership
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Check if deleting the current thumbnail
    const [mediaRow] = await query(
      'SELECT is_thumbnail FROM Recipe_Media WHERE media_url = ? AND recipe_id = ?',
      [mediaUrl, recipeId]
    );
    if (!mediaRow) return res.status(404).json({ error: 'Media not found' });

    await query(
      'DELETE FROM Recipe_Media WHERE media_url = ? AND recipe_id = ?',
      [mediaUrl, recipeId]
    );

    // If deleted item was thumbnail, promote the next available media item
    if (mediaRow.is_thumbnail) {
      await query(
        `UPDATE Recipe_Media SET is_thumbnail = TRUE
         WHERE recipe_id = ? LIMIT 1`,
        [recipeId]
      );
    }

    res.json({ message: 'Media deleted' });
  } catch (err) {
    console.error('DELETE /recipes/:id/media/:mediaUrl error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Allows_Substitution

// Get all allowed substitutions for a recipe
router.get('/:id/substitutions', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const subs = await query(
      `SELECT asub.original_item_id AS source_ingredient_id,
              i_orig.name AS source_ingredient_name,
              asub.substitute_item_id AS sub_ingredient_id,
              i_sub.name AS sub_ingredient_name,
              asub.quantity_multiplier
       FROM Allows_Substitution asub
       JOIN Ingredient i_orig ON asub.original_item_id = i_orig.ingredient_id
       JOIN Ingredient i_sub  ON asub.substitute_item_id = i_sub.ingredient_id
       WHERE asub.recipe_id = ?`,
      [recipeId]
    );

    res.json(subs);
  } catch (err) {
    console.error('GET /recipes/:id/substitutions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a substitution rule - author only, blocked by D04 trigger if same ingredient
router.post('/:id/substitutions', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const { source_ingredient_id, sub_ingredient_id, quantity_multiplier = 1.0 } = req.body;
    if (!source_ingredient_id || !sub_ingredient_id) {
      return res.status(400).json({ error: 'source_ingredient_id and sub_ingredient_id are required' });
    }

    // Catch same-ingredient attempt before hitting the DB trigger
    if (Number(source_ingredient_id) === Number(sub_ingredient_id)) {
      return res.status(400).json({ error: 'An ingredient cannot substitute itself' });
    }

    // Verify ownership
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await query(
      `INSERT INTO Allows_Substitution
         (recipe_id, original_item_id, substitute_item_id, quantity_multiplier)
       VALUES (?, ?, ?, ?)`,
      [recipeId, source_ingredient_id, sub_ingredient_id, quantity_multiplier]
    );

    res.status(201).json({ message: 'Substitution added' });
  } catch (err) {
    console.error('POST /recipes/:id/substitutions error:', err);
    // D04 trigger fires this signal when same ingredient is attempted
    if (err.message?.includes('original_item_id and substitute_item_id must be different')) {
      return res.status(400).json({ error: 'An ingredient cannot substitute itself' });
    }
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Substitution rule already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a substitution rule - author only
router.delete('/:id/substitutions/:subId', requireLogin, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    // subId format: "sourceId-subId" (e.g. "3-7")
    const [sourceId, substituteId] = req.params.subId.split('-').map(Number);

    if (isNaN(recipeId) || isNaN(sourceId) || isNaN(substituteId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    // Verify ownership
    const [rec] = await query(
      'SELECT publisher_home_cook_id, publisher_chef_id FROM Recipe WHERE recipe_id = ?',
      [recipeId]
    );
    if (!rec) return res.status(404).json({ error: 'Recipe not found' });
    const ownerId = rec.publisher_home_cook_id ?? rec.publisher_chef_id;
    if (Number(ownerId) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const result = await query(
      `DELETE FROM Allows_Substitution
       WHERE recipe_id = ? AND original_item_id = ? AND substitute_item_id = ?`,
      [recipeId, sourceId, substituteId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Substitution not found' });

    res.json({ message: 'Substitution deleted' });
  } catch (err) {
    console.error('DELETE /recipes/:id/substitutions/:subId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;