import client from './client';

export const getRecipes = (params) =>
  client.get('/recipes', { params }).then(r => r.data);

export const getRecipe = (id) =>
  client.get(`/recipes/${id}`).then(r => r.data);

export const createRecipe = (data) =>
  client.post('/recipes', data).then(r => r.data);

export const updateRecipe = (id, data) =>
  client.put(`/recipes/${id}`, data).then(r => r.data);

export const deleteRecipe = (id) =>
  client.delete(`/recipes/${id}`).then(r => r.data);

export const forkRecipe = (id) =>
  client.post(`/recipes/${id}/fork`).then(r => r.data);

export const publishRecipe = (id) =>
  client.post(`/recipes/${id}/publish`).then(r => r.data);

export const getMyRecipes = () =>
  client.get('/recipes/my').then(r => r.data);

export const getRecipePerformance = (id) =>
  client.get(`/recipes/${id}/performance`).then(r => r.data);

// Recipe_Media
export const getRecipeMedia = (id) =>
  client.get(`/recipes/${id}/media`).then(r => r.data);

export const addRecipeMedia = (id, data) =>
  client.post(`/recipes/${id}/media`, data).then(r => r.data);

export const updateRecipeMedia = (id, mediaId, data) =>
  client.patch(`/recipes/${id}/media/${mediaId}`, data).then(r => r.data);

export const deleteRecipeMedia = (id, mediaId) =>
  client.delete(`/recipes/${id}/media/${mediaId}`).then(r => r.data);

// Allows_Substitution (B22)
export const getRecipeSubstitutions = (id) =>
  client.get(`/recipes/${id}/substitutions`).then(r => r.data);

export const addRecipeSubstitution = (id, data) =>
  client.post(`/recipes/${id}/substitutions`, data).then(r => r.data);

export const deleteRecipeSubstitution = (id, subId) =>
  client.delete(`/recipes/${id}/substitutions/${subId}`).then(r => r.data);
