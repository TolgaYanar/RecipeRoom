import client from './client';

export const getUser = (id) =>
  client.get(`/users/${id}`).then(r => r.data);

export const updateUser = (id, data) =>
  client.patch(`/users/${id}`, data).then(r => r.data);

export const getUserRecipes = (id) =>
  client.get(`/users/${id}/recipes`).then(r => r.data);

// Returns Verified_Chef royalty stats (§3.4.2 royalty statistics query)
export const getUserRoyalties = (id) =>
  client.get(`/users/${id}/royalties`).then(r => r.data);

// Meal_List + Contains_Recipe.
// Pass recipeId to get a `contains_recipe` flag per list — used by the
// Save-to-list picker to render initial checkbox state.
export const getMealLists = (id, recipeId) =>
  client.get(`/users/${id}/meal-lists`, {
    params: recipeId ? { recipe_id: recipeId } : undefined,
  }).then(r => r.data);

export const getMealListRecipes = (id, listId) =>
  client.get(`/users/${id}/meal-lists/${encodeURIComponent(listId)}/recipes`).then(r => r.data);

export const createMealList = (id, data) =>
  client.post(`/users/${id}/meal-lists`, data).then(r => r.data);

export const updateMealList = (id, listId, data) =>
  client.patch(`/users/${id}/meal-lists/${encodeURIComponent(listId)}`, data).then(r => r.data);

export const deleteMealList = (id, listId) =>
  client.delete(`/users/${id}/meal-lists/${encodeURIComponent(listId)}`).then(r => r.data);

export const addToMealList = (id, listId, data) =>
  client.post(`/users/${id}/meal-lists/${encodeURIComponent(listId)}/recipes`, data).then(r => r.data);

export const removeFromMealList = (id, listId, recipeId) =>
  client.delete(`/users/${id}/meal-lists/${encodeURIComponent(listId)}/recipes/${recipeId}`).then(r => r.data);

// Follow graph + saved recipes
export const getFollowState = (id) =>
  client.get(`/users/${id}/follow`).then(r => r.data);

export const toggleFollow = (id) =>
  client.post(`/users/${id}/follow`).then(r => r.data);

export const getSavedRecipes = (id) =>
  client.get(`/users/${id}/saved`).then(r => r.data);

export const getUserBalance = (id) =>
  client.get(`/users/${id}/balance`).then(r => r.data);

export const topUpBalance = (id, amount) =>
  client.post(`/users/${id}/balance/topup`, { amount }).then(r => r.data);
