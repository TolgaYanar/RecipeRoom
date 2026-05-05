import client from './client';

export const createReview = (recipeId, data) =>
  client.post(`/reviews/recipe/${recipeId}`, data).then(r => r.data);

export const getReviews = (recipeId) =>
  client.get(`/reviews/recipe/${recipeId}`).then(r => r.data);

export const deleteReview = (id) =>
  client.delete(`/reviews/${id}`).then(r => r.data);

export const toggleReviewLike = (data) =>
  client.post('/reviews/like', data).then(r => r.data);

export const getReviewLikes = (recipeId) =>
  client.get(`/reviews/recipe/${recipeId}/likes`).then(r => r.data);
