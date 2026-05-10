import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, Trophy, Users, Calendar, TrendingUp, Plus,
} from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getHomeHighlights } from '../api/highlights';
import { getRecipes } from '../api/recipes';
import { getChallenges, getMyChallenges } from '../api/challenges';
import { useAuth } from '../context/AuthContext';

const QUICK_FILTERS = [
  { label: 'All',          to: '/recipes' },
  { label: 'Italian',      to: '/recipes?cuisine=italian' },
  { label: 'Mexican',      to: '/recipes?cuisine=mexican' },
  { label: 'Japanese',     to: '/recipes?cuisine=japanese' },
  { label: 'Healthy',      to: '/recipes?dietary=vegetarian' },
  { label: 'Desserts',     to: '/recipes?category=dessert' },
  { label: 'Quick & Easy', to: '/recipes?cookingTime=under-30' },
];

const TABS = [
  { id: 'for-you',   label: 'For You'   },
  { id: 'trending',  label: 'Trending'  },
  { id: 'recent',    label: 'Recent'    },
  { id: 'following', label: 'Following' },
];

export default function Home() {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState(null);
  const [challenges, setChallenges] = useState(null);

  useEffect(() => {
    getHomeHighlights().then(setHighlights).catch(() => setHighlights({}));
    let cancelled = false;
    Promise.all([
      getChallenges().catch(() => []),
      user ? getMyChallenges().catch(() => []) : Promise.resolve([]),
    ]).then(([list, mine]) => {
      if (cancelled) return;
      const myMap = new Map((mine ?? []).map((m) => [m.challenge_id, m]));
      setChallenges((list ?? []).map((c) => {
        const me = myMap.get(c.id);
        return {
          ...c,
          user_joined: !!me,
          user_won:    me?.progress_status === 'Winner',
        };
      }));
    });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="bg-white">
      <Hero />
      <QuickFilterStrip />
      <FeaturedSelectionsSection highlights={highlights} />
      <FeedSection highlights={highlights} />
      <ChallengesSection challenges={challenges} />
      <RecommendedSection highlights={highlights} />
    </div>
  );
}

function FeaturedSelectionsSection({ highlights }) {
  // Backend returns featured as a flat list of recipes each tagged with the
  // curator's selection_type — group them so each Featured_Selection row
  // renders as its own strip.
  const groups = useMemo(() => {
    const featured = highlights?.featured ?? [];
    const byType = new Map();
    for (const r of featured) {
      const key = r.selection_type ?? 'Featured';
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key).push(r);
    }
    return Array.from(byType.entries());
  }, [highlights]);

  if (highlights === null) return null;
  if (groups.length === 0) return null;

  return (
    <section className="bg-[#FAF8F5] border-y border-[#EBEBEB]">
      <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
        {groups.map(([type, recipes]) => (
          <div key={type}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#EBEBEB] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} fill="#F5C518" />
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-[#1A1A1A]">{type}</h3>
                <p className="text-[12px] text-[#6B6B6B]">
                  Editor's pick · curated by the RecipeRoom admin · {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
                </p>
              </div>
            </div>
            <div className="-mx-6 px-6 overflow-x-auto pb-2 [scrollbar-width:thin]">
              <div className="flex gap-4 snap-x snap-mandatory">
                {recipes.map((r) => (
                  <div
                    key={`${type}-${r.recipe_id}`}
                    className="snap-start shrink-0 w-[260px] sm:w-[280px]"
                  >
                    <RecipeCard recipe={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/recipes?q=${encodeURIComponent(q)}` : '/recipes');
  };

  return (
    <section className="relative bg-[#0E1A14] text-white overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(245,197,24,0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(27,58,45,0.4), transparent 50%)',
        }}
      />
      <div className="relative max-w-[1100px] mx-auto px-6 py-20 text-center">
        <h1 className="text-[44px] md:text-[64px] font-bold leading-[1.05] mb-6">
          <span className="block">Discover Recipes.</span>
          <span className="block text-[#F5C518]">Shop Fresh Ingredients.</span>
        </h1>
        <p className="text-[15px] md:text-[16px] text-white/70 max-w-[640px] mx-auto mb-8 leading-relaxed">
          Farm-to-table recipes from verified chefs, with pre-portioned ingredients
          delivered straight from local suppliers.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link
            to="/recipes"
            className="inline-flex items-center px-6 py-3 bg-[#F5C518] text-[#1A1A1A] rounded-lg text-[15px] font-semibold hover:bg-[#E0B515] transition-colors"
          >
            Explore Recipes
          </Link>
          <Link
            to="/challenges"
            className="inline-flex items-center px-6 py-3 border-[1.5px] border-white text-white rounded-lg text-[15px] font-semibold hover:bg-white hover:text-[#0E1A14] transition-colors"
          >
            Join a Challenge
          </Link>
        </div>

        <form onSubmit={submit} className="max-w-[680px] mx-auto">
          <div className="relative bg-white rounded-xl flex items-center pl-4 pr-1 py-1 shadow-lg">
            <Search className="w-5 h-5 text-[#9E9E9E] shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search for pasta, healthy bowls, chicken..."
              className="flex-1 px-3 py-3 text-[14px] text-[#1A1A1A] placeholder-[#9E9E9E] bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function QuickFilterStrip() {
  return (
    <div className="bg-[#FAF8F5] border-b border-[#EBEBEB]">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-2 overflow-x-auto">
        {QUICK_FILTERS.map((f, i) => (
          <Link
            key={f.label}
            to={f.to}
            className={
              'shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ' +
              (i === 0
                ? 'bg-[#1B3A2D] text-white border-[#1B3A2D]'
                : 'bg-white text-[#1A1A1A] border-[#D0D0D0] hover:border-[#1B3A2D]')
            }
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FeedSection({ highlights }) {
  const [tab, setTab] = useState('for-you');
  const [tabRecipes, setTabRecipes] = useState({ recent: null, following: null });

  const trending = highlights?.trending ?? [];
  const recommendations = highlights?.recommendations ?? [];

  // Recent / Following are lazy — only fire /recipes the first time each tab opens
  useEffect(() => {
    if ((tab === 'recent' || tab === 'following') && tabRecipes[tab] === null) {
      const params = tab === 'following' ? { following: 1 } : { sort: 'recent' };
      getRecipes(params)
        .then((data) => setTabRecipes((prev) => ({ ...prev, [tab]: itemsOf(data) })))
        .catch(() => setTabRecipes((prev) => ({ ...prev, [tab]: [] })));
    }
  }, [tab, tabRecipes]);

  let recipes;
  let stillLoading = false;
  switch (tab) {
    case 'trending':  recipes = trending;        stillLoading = highlights === null; break;
    case 'recent':    recipes = tabRecipes.recent;    stillLoading = recipes === null; break;
    case 'following': recipes = tabRecipes.following; stillLoading = recipes === null; break;
    case 'for-you':
    default:          recipes = recommendations; stillLoading = highlights === null;
  }

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="border-b border-[#EBEBEB] mb-6">
          <div className="flex items-center gap-6 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={
                    'relative shrink-0 pb-3 text-[14px] font-semibold transition-colors ' +
                    (active ? 'text-[#1A1A1A]' : 'text-[#9E9E9E] hover:text-[#1A1A1A]')
                  }
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#1B3A2D]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {stillLoading ? (
          <LoadingSpinner size="lg" />
        ) : !recipes?.length ? (
          <EmptyState message="Nothing here yet — try another tab." icon="🍽️" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recipes.map((r) => <RecipeCard key={r.recipe_id} recipe={r} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ChallengesSection({ challenges }) {
  if (challenges === null) {
    return (
      <section className="bg-[#FAF8F5]">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <h2 className="text-[28px] font-bold text-[#1A1A1A] mb-6">Kitchen Challenges</h2>
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  const list = Array.isArray(challenges) ? challenges : (challenges?.items ?? []);
  const activeCount = list.filter((c) => c.user_joined).length;

  return (
    <section className="bg-[#FAF8F5]">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h2 className="text-[28px] font-bold text-[#1A1A1A] mb-1">Kitchen Challenges</h2>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-[16px] font-bold text-[#1A1A1A]">Kitchen Challenges</h3>
            <p className="text-[13px] text-[#6B6B6B]">
              Join our community in fun cooking challenges
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B6B6B]">
              <Trophy className="w-4 h-4" strokeWidth={1.5} />
              {activeCount} Active
            </span>
            <Link
              to="/challenges"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Log Recipe
            </Link>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState message="No active challenges right now." icon="🏆" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ChallengeCard({ challenge: c }) {
  const joined = c.user_joined;
  const cardCls = joined
    ? 'bg-[#FBF1D2] border border-[#F0E2A8] border-l-4 border-l-[#1B3A2D]'
    : 'bg-white border border-[#EBEBEB]';

  const pct = c.progress
    ? Math.min(100, Math.round((c.progress.done / c.progress.total) * 100))
    : 0;

  return (
    <div className={`${cardCls} rounded-2xl p-5`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center text-[22px] shrink-0">
          {c.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[16px] font-bold text-[#1A1A1A]">{c.name}</h4>
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

      {c.progress && (
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
                background: c.completed
                  ? 'linear-gradient(90deg, #2D6A4F, #F5C518)'
                  : '#2D6A4F',
              }}
            />
          </div>
        </>
      )}

      {c.user_won && (
        <div className="text-[14px] font-semibold text-[#1A1A1A] mb-3">
          🏆 Challenge Complete! Badge Earned! 🎉
        </div>
      )}

      {c.recent_logs?.length > 0 && (
        <div className="bg-[#FAEFCB] rounded-lg px-3 py-2.5 mb-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] mb-1.5">📋 Recent Cook Logs</div>
          <ul className="space-y-1 text-[12px] text-[#5A4A1A]">
            {c.recent_logs.map((log, i) => (
              <li key={i}>· {log.date} · {log.emoji} {log.text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 text-[12px] text-[#6B6B6B] mb-4">
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

      {c.completed ? (
        <Link
          to="/challenges"
          className="block w-full text-center py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors"
        >
          View Leaderboard
        </Link>
      ) : joined ? (
        <div className="flex items-center gap-2">
          <Link
            to="/challenges"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            Leaderboard
          </Link>
          <Link
            to="/challenges"
            className="px-4 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#B71C1C] hover:text-[#B71C1C] transition-colors"
          >
            Leave
          </Link>
        </div>
      ) : (
        <Link
          to="/challenges"
          className="block w-full text-center py-2.5 bg-[#A8893E] text-white rounded-lg text-[13px] font-semibold hover:bg-[#917430] transition-colors"
        >
          Join Challenge
        </Link>
      )}
    </div>
  );
}

function RecommendedSection({ highlights }) {
  // backend only fills recommendations after the user has a flavor profile;
  // fall back to editor's picks so new users still see something here
  const recipes = useMemo(() => {
    const recs = highlights?.recommendations ?? [];
    const source = recs.length > 0 ? recs : (highlights?.featured ?? []);
    return source.slice(0, 6);
  }, [highlights]);

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h2 className="text-[28px] font-bold text-[#1A1A1A] mb-5">Recommended For You</h2>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} fill="#F5C518" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#1A1A1A]">Recommended For You</h3>
            <p className="text-[13px] text-[#6B6B6B]">
              Based on your dietary preferences and favorite ingredients
            </p>
          </div>
        </div>

        {highlights === null ? (
          <LoadingSpinner size="lg" />
        ) : recipes.length === 0 ? (
          <EmptyState message="Personalized picks will show up here once you have a flavor profile." icon="✨" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((r) => <RecipeCard key={r.recipe_id} recipe={r} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// Backend may return either an array or { items, total, totalPages } — accept both.
function itemsOf(data) {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}
