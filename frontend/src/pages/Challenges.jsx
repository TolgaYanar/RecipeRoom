import { useEffect, useMemo, useState } from 'react';
import {
  Trophy, Lock, Sparkles, Users, Calendar, TrendingUp, Plus, X,
  Award, Medal,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getChallenges, getChallenge, submitChallengeEntry } from '../api/challenges';
import { getMyRecipes } from '../api/recipes';

export default function Challenges() {
  const [challenges, setChallenges] = useState(null);
  const [statusTab, setStatusTab]   = useState('active');
  const [leaderboardFor, setLeaderboardFor] = useState(null); // challenge id
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    getChallenges().then(setChallenges).catch(() => setChallenges([]));
  }, []);

  const list = Array.isArray(challenges) ? challenges : (challenges?.items ?? []);
  const activeList    = list.filter((c) => !c.completed);
  const completedList = list.filter((c) =>  c.completed);
  const visibleList   = statusTab === 'completed' ? completedList : activeList;

  const joinedActive = activeList.filter((c) => c.user_joined);

  // optimistic join/leave so the UI feels alive even before backend ships
  const togglJoined = (id, joined) => {
    setChallenges((prev) => {
      const items = Array.isArray(prev) ? prev : (prev?.items ?? []);
      const next = items.map((c) =>
        c.id === id ? { ...c, user_joined: joined, joined: (c.joined || 0) + (joined ? 1 : -1) } : c
      );
      return Array.isArray(prev) ? next : { ...prev, items: next };
    });
  };

  const reloadChallenges = () => {
    getChallenges().then(setChallenges).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <PageHeader />

        <StatusTabs
          tab={statusTab}
          onChange={setStatusTab}
          activeCount={activeList.length}
          completedCount={completedList.length}
        />

        <BadgesCard challenges={list} loading={challenges === null} />

        <SectionHeader
          activeJoinedCount={joinedActive.length}
          onLogRecipe={() => setLogOpen(true)}
          canLog={joinedActive.length > 0}
        />

        {challenges === null ? (
          <LoadingSpinner size="lg" />
        ) : visibleList.length === 0 ? (
          <EmptyState
            icon="🏆"
            message={statusTab === 'completed'
              ? 'No completed challenges yet.'
              : 'No active challenges right now.'}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleList.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onJoin={() => togglJoined(c.id, true)}
                onLeave={() => togglJoined(c.id, false)}
                onLeaderboard={() => setLeaderboardFor(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {leaderboardFor != null && (
        <LeaderboardModal
          challengeId={leaderboardFor}
          onClose={() => setLeaderboardFor(null)}
        />
      )}

      {logOpen && (
        <LogRecipeModal
          joinedChallenges={joinedActive}
          onClose={() => setLogOpen(false)}
          onLogged={() => { setLogOpen(false); reloadChallenges(); }}
        />
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex items-center gap-4 mb-5">
      <div className="w-12 h-12 rounded-xl bg-[#FAEFCB] border border-[#F0E2A8] flex items-center justify-center">
        <Trophy className="w-6 h-6 text-[#A8893E]" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">Kitchen Challenges</h1>
        <p className="text-[14px] text-[#6B6B6B] mt-0.5">
          Join our community and participate in exciting cooking challenges
        </p>
      </div>
    </header>
  );
}

function StatusTabs({ tab, onChange, activeCount, completedCount }) {
  const Btn = ({ id, label, count, icon }) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => onChange(id)}
        className={
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ' +
          (active
            ? 'bg-[#1B3A2D] text-white border border-[#1B3A2D]'
            : 'bg-white text-[#1A1A1A] border border-[#D0D0D0] hover:border-[#1B3A2D]')
        }
      >
        {icon}
        {count} {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Btn id="active"    label="Active Challenges" count={activeCount}    icon={<Trophy   className="w-4 h-4" strokeWidth={1.5} />} />
      <Btn id="completed" label="Completed"         count={completedCount} icon={<Sparkles className="w-4 h-4" strokeWidth={1.5} />} />
    </div>
  );
}

function BadgesCard({ challenges, loading }) {
  // every challenge can carry a badge — show a fixed grid of all known ones
  const badges = useMemo(() => {
    return challenges
      .map((c) => c.badge)
      .filter(Boolean);
  }, [challenges]);

  if (loading) {
    return (
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 mb-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned);

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1A1A]">Your Badges</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-0.5">{earned.length} of {badges.length} earned</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F5F5F5] rounded-full text-[12px] font-medium text-[#6B6B6B]">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
          {earned.length} Badges
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map((b, i) => <BadgeTile key={b.id ?? i} badge={b} />)}
      </div>
    </div>
  );
}

function BadgeTile({ badge: b }) {
  if (b.earned) {
    return (
      <div className="bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl p-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center text-[22px] mb-2">
          {b.emoji ?? '🏅'}
        </div>
        <div className="text-[13px] font-semibold text-[#1A1A1A]">{b.name}</div>
        <div className="text-[11px] text-[#6B6B6B] mt-1 leading-snug">{b.description}</div>
        {b.earned_at && (
          <div className="text-[11px] font-medium text-[#1A1A1A] mt-2">
            Earned {b.earned_at}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#FAEFCB] border border-[#F0E2A8] rounded-xl p-4 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-[#F5E4A0] flex items-center justify-center mb-2">
        <Lock className="w-5 h-5 text-[#A8893E]" strokeWidth={1.5} />
      </div>
      <div className="text-[13px] font-semibold text-[#5A4A1A]">{b.name}</div>
      <div className="text-[11px] text-[#8A7530] mt-1 leading-snug">{b.description}</div>
      <div className="text-[11px] text-[#8A7530] mt-2 italic">Not yet earned</div>
    </div>
  );
}

function SectionHeader({ activeJoinedCount, onLogRecipe, canLog }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
      <div>
        <h2 className="text-[20px] font-bold text-[#1A1A1A]">Kitchen Challenges</h2>
        <p className="text-[13px] text-[#6B6B6B] mt-0.5">Join our community in fun cooking challenges</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F5] rounded-full text-[12px] font-medium text-[#6B6B6B]">
          <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} />
          {activeJoinedCount} Active
        </span>
        <button
          type="button"
          disabled={!canLog}
          onClick={onLogRecipe}
          className={
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ' +
            (canLog
              ? 'bg-[#1B3A2D] text-white hover:bg-[#142B22]'
              : 'bg-[#9CA59E] text-white cursor-not-allowed')
          }
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Log Recipe
        </button>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge: c, onJoin, onLeave, onLeaderboard }) {
  const joined = c.user_joined;
  const cardCls = joined
    ? 'bg-[#FBF1D2] border border-[#F0E2A8] border-l-4 border-l-[#1B3A2D]'
    : 'bg-white border border-[#EBEBEB]';

  const pct = c.progress
    ? Math.min(100, Math.round((c.progress.done / Math.max(1, c.progress.total)) * 100))
    : 0;

  return (
    <div className={`${cardCls} rounded-2xl p-5`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center text-[22px] shrink-0">
          {c.icon ?? '🍳'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[16px] font-bold text-[#1A1A1A]">{c.name}</h3>
            {joined && (
              <span className="shrink-0 text-[11px] font-semibold text-[#1B3A2D] bg-white border border-[#EBEBEB] px-2 py-0.5 rounded-full">
                ✓ Joined
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#6B6B6B] leading-relaxed">{c.description}</p>
        </div>
      </div>

      {c.reward && (
        <div className="bg-white border border-[#EBEBEB] rounded-lg px-3 py-2 text-[12px] text-[#6B6B6B] mb-4 inline-flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-[#F5C518]" strokeWidth={1.5} />
          Reward: <span className="font-semibold text-[#1A1A1A]">{c.reward.name}</span> · {c.reward.points} points
        </div>
      )}

      {joined && c.progress && (
        <>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <span className="text-[#1A1A1A] font-medium">Progress</span>
            <span className="text-[#6B6B6B]">{c.progress.done}/{c.progress.total} recipes</span>
          </div>
          <div className="h-1.5 rounded-full bg-white border border-[#EBEBEB] overflow-hidden mb-4">
            <div
              className="h-full"
              style={{
                width: `${pct}%`,
                background: c.completed ? 'linear-gradient(90deg, #2D6A4F, #F5C518)' : '#F5C518',
              }}
            />
          </div>
        </>
      )}

      {joined && c.recent_logs?.length > 0 && (
        <div className="bg-[#FAEFCB] rounded-lg px-3 py-2.5 mb-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] mb-1.5">📋 Recent Cook Logs</div>
          <ul className="space-y-1 text-[12px] text-[#5A4A1A]">
            {c.recent_logs.map((log, i) => (
              <li key={i}>· {log.date} - {log.emoji} {log.text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 text-[12px] text-[#6B6B6B] mb-4">
        {c.joined != null && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            {c.joined.toLocaleString('tr-TR')} joined
          </span>
        )}
        {c.days_left != null && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
            {c.days_left} days left
          </span>
        )}
      </div>

      {joined ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLeaderboard}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            Leaderboard
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#B71C1C] hover:text-[#B71C1C] transition-colors"
          >
            Leave
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onJoin}
          className="w-full py-2.5 bg-[#A8893E] text-white rounded-lg text-[13px] font-semibold hover:bg-[#917430] transition-colors"
        >
          Join Challenge
        </button>
      )}
    </div>
  );
}

function LeaderboardModal({ challengeId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getChallenge(challengeId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({}); });
    return () => { cancelled = true; };
  }, [challengeId]);

  const participants = data?.leaderboard ?? data?.participants ?? [];

  return (
    <ModalShell title="Challenge Leaderboard" onClose={onClose} maxW="max-w-[560px]">
      {data === null ? (
        <LoadingSpinner size="md" />
      ) : (
        <>
          <div className="bg-[#F5F5F5] rounded-xl p-4 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#EBEBEB] flex items-center justify-center text-[20px]">
              {data.icon ?? '🏆'}
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#1A1A1A]">
                {data.name ?? 'Challenge'} Leaderboard
              </div>
              <div className="text-[12px] text-[#6B6B6B]">{participants.length} participants</div>
            </div>
          </div>

          {participants.length === 0 ? (
            <EmptyState message="No entries yet." icon="📋" />
          ) : (
            <ul className="space-y-3">
              {participants.map((p, i) => (
                <LeaderboardRow key={p.user_id ?? p.name ?? i} participant={p} rank={p.rank ?? i + 1} />
              ))}
            </ul>
          )}
        </>
      )}
    </ModalShell>
  );
}

function LeaderboardRow({ participant: p, rank }) {
  const total = p.recipes?.total ?? 1;
  const done  = p.recipes?.done  ?? 0;
  const pct   = Math.min(100, Math.round((done / Math.max(1, total)) * 100));

  return (
    <li className="flex items-center gap-3">
      <RankBadge rank={rank} />
      <img
        alt=""
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name || 'User')}`}
        className="w-10 h-10 rounded-full bg-[#F5F5F5] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">{p.name}</span>
          {p.is_self && <span className="text-[12px] text-[#6B6B6B]">(You)</span>}
          {p.completed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-[#1B3A2D] px-2 py-0.5 rounded-full">
              <Medal className="w-3 h-3" strokeWidth={1.5} /> Completed
            </span>
          )}
        </div>
        <div className="text-[12px] text-[#6B6B6B]">
          {done}/{total} recipes · {p.points ?? 0} points{p.completed_at ? ` · ${p.completed_at}` : ''}
        </div>
      </div>
      <div className="w-24 h-1.5 rounded-full bg-[#EBEBEB] overflow-hidden shrink-0">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: p.completed ? '#1B3A2D' : 'linear-gradient(90deg, #1B3A2D, #F5C518)',
          }}
        />
      </div>
    </li>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="w-10 flex flex-col items-center shrink-0">
        <Trophy className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} fill="#F5C518" />
        <span className="text-[11px] font-bold text-[#1A1A1A]">#1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 flex flex-col items-center shrink-0">
        <Medal className="w-5 h-5 text-[#9E9E9E]" strokeWidth={1.5} />
        <span className="text-[11px] font-bold text-[#1A1A1A]">#2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 flex flex-col items-center shrink-0">
        <Award className="w-5 h-5 text-[#A8893E]" strokeWidth={1.5} />
        <span className="text-[11px] font-bold text-[#1A1A1A]">#3</span>
      </div>
    );
  }
  return (
    <div className="w-10 flex justify-center shrink-0">
      <span className="w-7 h-7 rounded-full bg-[#F5C518] text-[#1A1A1A] text-[12px] font-bold flex items-center justify-center">
        {rank}
      </span>
    </div>
  );
}

function LogRecipeModal({ joinedChallenges, onClose, onLogged }) {
  const [challengeId, setChallengeId] = useState(joinedChallenges[0]?.id ?? '');
  const [recipes, setRecipes] = useState(null);
  const [recipeId, setRecipeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyRecipes()
      .then((data) => setRecipes(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setRecipes([]));
  }, []);

  const submit = async () => {
    if (!challengeId || !recipeId) return;
    setSubmitting(true);
    try {
      await submitChallengeEntry(challengeId, { recipe_id: recipeId });
      onLogged();
    } catch {
      // already toasted by the interceptor
      setSubmitting(false);
    }
  };

  const canSubmit = !!challengeId && !!recipeId && !submitting;

  return (
    <ModalShell title="Log a Cooked Recipe" onClose={onClose} maxW="max-w-[460px]">
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">
          Select Challenge <span className="text-[#B71C1C]">*</span>
        </label>
        <select
          value={challengeId}
          onChange={(e) => setChallengeId(Number(e.target.value) || e.target.value)}
          className="w-full px-3 py-2.5 border border-[#D0D0D0] rounded-lg text-[14px] text-[#1A1A1A] focus:outline-none focus:border-[#1B3A2D] bg-white"
        >
          {joinedChallenges.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ?? '🏆'} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">
          Select Recipe <span className="text-[#B71C1C]">*</span>
        </label>
        {recipes === null ? (
          <LoadingSpinner size="sm" />
        ) : recipes.length === 0 ? (
          <div className="text-[13px] text-[#6B6B6B] py-4 text-center border border-dashed border-[#D0D0D0] rounded-lg">
            You haven't published any recipes yet.
          </div>
        ) : (
          <ul className="space-y-2 max-h-[260px] overflow-auto pr-1">
            {recipes.map((r) => {
              const id = r.recipe_id ?? r.id;
              const active = String(recipeId) === String(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setRecipeId(id)}
                    className={
                      'w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors ' +
                      (active
                        ? 'border-[#1B3A2D] bg-[#F5F8F6]'
                        : 'border-[#EBEBEB] hover:border-[#D0D0D0]')
                    }
                  >
                    <img
                      alt=""
                      src={r.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.title || 'R')}`}
                      className="w-12 h-12 rounded-lg object-cover bg-[#F5F5F5]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">{r.title}</div>
                      <div className="text-[11px] text-[#6B6B6B]">
                        {r.cooking_time ? `${r.cooking_time} min · ` : ''}{r.cuisine || 'Universal'}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={
            'flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ' +
            (canSubmit
              ? 'bg-[#1B3A2D] text-white hover:bg-[#142B22]'
              : 'bg-[#9CA59E] text-white cursor-not-allowed')
          }
        >
          {submitting ? 'Submitting…' : 'Submit Cook Log'}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children, maxW = 'max-w-[480px]' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxW} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
