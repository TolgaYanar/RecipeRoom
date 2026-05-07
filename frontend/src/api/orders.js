import client from './client';

export const createOrder = (data) =>
  client.post('/orders', data).then(r => r.data);

export const getMyOrders = () =>
  client.get('/orders/mine').then(r => r.data);

export const getSupplierOrders = () =>
  client.get('/orders/supplier').then(r => r.data);

export const getOrder = (id) =>
  client.get(`/orders/${id}`).then(r => r.data);
