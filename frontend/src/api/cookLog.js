import client from './client';

export const addCookLog = (userId, data) =>
  client.post(`/users/${userId}/cook-log`, data).then(r => r.data);

export const getCookLog = (userId, params) =>
  client.get(`/users/${userId}/cook-log`, { params }).then(r => r.data);

export const deleteCookLogEntry = (userId, entryId) =>
  client.delete(`/users/${userId}/cook-log/${entryId}`).then(r => r.data);
