import client from './client';

// Home feed: { featured[], trending[], recommendations[], active_challenges[] }
export const getHomeHighlights = () =>
  client.get('/highlights/home').then(r => r.data);
