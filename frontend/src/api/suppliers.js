import client from './client';

export const getSupplierInventory = (id) =>
  client.get(`/suppliers/${id}/inventory`).then(r => r.data);

export const createInventoryItem = (data) =>
  client.post('/suppliers/inventory', data).then(r => r.data);

export const updateInventoryItem = (id, data) =>
  client.patch(`/suppliers/inventory/${id}`, data).then(r => r.data);

export const deleteInventoryItem = (id) =>
  client.delete(`/suppliers/inventory/${id}`).then(r => r.data);

// Reads Supplier_Stock_Status view
export const getStockStatus = () =>
  client.get('/suppliers/stock-status').then(r => r.data);
