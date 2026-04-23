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

// Meal_List + Contains_Recipe
export const getMealLists = (id) =>
  client.get(`/users/${id}/meal-lists`).then(r => r.data);

export const createMealList = (id, data) =>
  client.post(`/users/${id}/meal-lists`, data).then(r => r.data);

export const updateMealList = (id, listId, data) =>
  client.patch(`/users/${id}/meal-lists/${listId}`, data).then(r => r.data);

export const deleteMealList = (id, listId) =>
  client.delete(`/users/${id}/meal-lists/${listId}`).then(r => r.data);

export const addToMealList = (id, listId, data) =>
  client.post(`/users/${id}/meal-lists/${listId}/recipes`, data).then(r => r.data);

export const removeFromMealList = (id, listId, recipeId) =>
  client.delete(`/users/${id}/meal-lists/${listId}/recipes/${recipeId}`).then(r => r.data);
