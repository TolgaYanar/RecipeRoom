import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then(r => r.data);

export const registerHomeCook = (data) =>
  client.post('/auth/register/home-cook', data).then(r => r.data);

export const registerChef = (data) =>
  client.post('/auth/register/chef', data).then(r => r.data);

export const registerSupplier = (data) =>
  client.post('/auth/register/supplier', data).then(r => r.data);

export const registerAdmin = (data) =>
  client.post('/auth/register/admin', data).then(r => r.data);

export const getMe = () =>
  client.get('/auth/me').then(r => r.data);
