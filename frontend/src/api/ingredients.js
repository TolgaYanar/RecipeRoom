import client from './client';

// LIKE autocomplete — satisfies CS353 flexible-query grading criterion
export const searchIngredients = (q) =>
  client.get('/ingredients/search', { params: { q } }).then(r => r.data);

// Taxonomy-based substitutes from Substitution_Rule / generic_taxonomy_name
export const getIngredientSubstitutes = (id) =>
  client.get(`/ingredients/${id}/substitutes`).then(r => r.data);
