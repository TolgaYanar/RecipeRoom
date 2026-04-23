import client from './client';

// Reads Has_Affinity (ingredient-based scores, per design report §3.3.2)
export const getFlavorProfile = (userId) =>
  client.get(`/users/${userId}/flavor-profile`).then(r => r.data);

// Upserts Has_Affinity weights
export const updateFlavorProfile = (userId, data) =>
  client.put(`/users/${userId}/flavor-profile`, data).then(r => r.data);

// Auto-infers affinity from Logs_Cook history
export const inferFlavorProfile = (userId) =>
  client.post(`/users/${userId}/flavor-profile/infer`).then(r => r.data);

// Ranked recipes by affinity dot-product (used by Home recommendations)
export const getRecommendations = (userId) =>
  client.get(`/users/${userId}/recommendations`).then(r => r.data);
