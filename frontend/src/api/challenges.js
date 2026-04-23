import client from './client';

export const getChallenges = () =>
  client.get('/challenges').then(r => r.data);

export const getChallenge = (id) =>
  client.get(`/challenges/${id}`).then(r => r.data);

export const createChallenge = (data) =>
  client.post('/challenges', data).then(r => r.data);

export const submitChallengeEntry = (id, data) =>
  client.post(`/challenges/${id}/entries`, data).then(r => r.data);

export const setChallengeWinner = (id, data) =>
  client.post(`/challenges/${id}/winner`, data).then(r => r.data);

export const updateChallenge = (id, data) =>
  client.patch(`/challenges/${id}`, data).then(r => r.data);
