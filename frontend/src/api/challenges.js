import client from './client';

export const getChallenges = () =>
  client.get('/challenges').then((r) => normalizeList(r.data));

export const getChallenge = (id) =>
  client.get(`/challenges/${id}`).then((r) => normalize(r.data));

export const createChallenge = (data) =>
  client.post('/challenges', data).then(r => r.data);

export const submitChallengeEntry = (id, data) =>
  client.post(`/challenges/${id}/entries`, data).then(r => r.data);

export const setChallengeWinner = (id, data) =>
  client.post(`/challenges/${id}/winner`, data).then(r => r.data);

export const updateChallenge = (id, data) =>
  client.patch(`/challenges/${id}`, data).then(r => r.data);

export const getMyChallenges = () =>
  client.get('/challenges/mine').then(r => r.data);

// Backend's /:id/entries upserts into Participates_in, so it doubles as join.
export const joinChallenge = (id) =>
  client.post(`/challenges/${id}/entries`, {}).then(r => r.data);

export const leaveChallenge = (id) =>
  client.delete(`/challenges/${id}/leave`).then(r => r.data);

// Backend returns flat columns (challenge_id, title, badge_name, etc.).
// Pages were built around a richer object shape — flatten the gap here so
// callers don't each have to rename the same fields.
function normalize(c) {
  if (!c) return c;
  const end = c.end_date ? new Date(c.end_date).getTime() : null;
  const days_left = end ? Math.max(0, Math.ceil((end - Date.now()) / 86_400_000)) : null;

  return {
    id:           c.challenge_id ?? c.id,
    name:         c.title ?? c.name,
    description:  c.description ?? '',
    icon:         '🏆',
    joined:       Number(c.participant_count ?? 0),
    days_left,
    completed:    !!c.has_ended,
    // user-specific flags aren't in the list response — default off
    user_joined:  !!c.user_joined,
    progress:     c.progress ?? null,
    recent_logs:  c.recent_logs ?? [],
    reward:       c.badge_name ? { name: c.badge_name, points: 0 } : null,
    badge:        c.badge_id ? {
      id:          c.badge_id,
      name:        c.badge_name,
      description: c.badge_description ?? `Awarded for finishing ${c.title}`,
      emoji:       '🏆',
      earned:      !!c.badge_earned,
      earned_at:   c.badge_earned_at ?? null,
    } : null,
    leaderboard: (c.leaderboard ?? c.participants ?? []).map(normalizeParticipant),
  };
}

function normalizeParticipant(p, i) {
  return {
    user_id:   p.user_id,
    name:      p.username ?? p.name ?? 'User',
    points:    Number(p.score ?? p.points ?? 0),
    completed: (p.progress_status ?? '').toLowerCase() === 'winner',
    rank:      p.rank ?? i + 1,
  };
}

function normalizeList(data) {
  const arr = Array.isArray(data) ? data : (data?.items ?? []);
  return arr.map(normalize);
}
