import client from './client';

// Shop This Meal substitution planner (B06)
// Returns per-ingredient: { preferred_supplier_item, price, in_stock, alternatives[] }
export const planSubstitutions = (data) =>
  client.post('/substitutions/plan', data).then(r => r.data);
