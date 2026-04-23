import client from './client';

// Chef verification
export const getPendingChefs = () =>
  client.get('/admin/pending-chefs').then(r => r.data);

export const approveChef = (id) =>
  client.post(`/admin/chefs/${id}/approve`).then(r => r.data);

export const rejectChef = (id) =>
  client.post(`/admin/chefs/${id}/reject`).then(r => r.data);

// Ingredient management
export const getAdminIngredients = () =>
  client.get('/admin/ingredients').then(r => r.data);

export const createAdminIngredient = (data) =>
  client.post('/admin/ingredients', data).then(r => r.data);

export const updateAdminIngredient = (id, data) =>
  client.patch(`/admin/ingredients/${id}`, data).then(r => r.data);

export const deleteAdminIngredient = (id) =>
  client.delete(`/admin/ingredients/${id}`).then(r => r.data);

// Content moderation
export const moderateContent = (type, id, data) =>
  client.post(`/admin/content/${type}/${id}/moderate`, data).then(r => r.data);

// Featured_Selection CRUD (B18)
export const getAdminHighlights = () =>
  client.get('/admin/highlights').then(r => r.data);

export const createAdminHighlight = (data) =>
  client.post('/admin/highlights', data).then(r => r.data);

export const updateAdminHighlight = (id, data) =>
  client.patch(`/admin/highlights/${id}`, data).then(r => r.data);

export const deleteAdminHighlight = (id) =>
  client.delete(`/admin/highlights/${id}`).then(r => r.data);
