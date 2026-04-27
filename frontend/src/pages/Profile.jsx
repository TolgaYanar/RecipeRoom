import { useEffect, useMemo, useState } from 'react';
import { Settings, MapPin, Sparkles, Plus, Trash2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RecipeCard from '../components/RecipeCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUser, getUserRecipes, getUserRoyalties } from '../api/users';
import { getCookLog } from '../api/cookLog';
import {
  getFlavorProfile, updateFlavorProfile,
} from '../api/flavorProfile';

const TABS_BASE = [
  { id: 'my-recipes',     label: 'My Recipes' },
  { id: 'saved',          label: 'Saved'      },
  { id: 'liked',          label: 'Liked'      },
  { id: 'cook-log',       label: 'Cook Log'   },
  { id: 'flavor-profile', label: 'Flavor Profile' },
];

const INGREDIENT_PICK_LIST = [
  'Tomato', 'Garlic', 'Onion', 'Chicken', 'Salmon', 'Avocado',
  'Cilantro', 'Lime', 'Bell Pepper', 'Pasta', 'Rice', 'Beef',
  'Eggs', 'Butter', 'Cheddar', 'Yogurt', 'Honey', 'Mushroom',
];

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('my-recipes');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    setProfileLoading(true);
    getUser(user.user_id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [user?.user_id]);

  if (!user) return null;

  if (profileLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isChef = user.user_type === 'Verified_Chef';
  const tabs = isChef
    ? [...TABS_BASE, { id: 'royalties', label: 'Royalties' }]
    : TABS_BASE;

  const displayName = profile?.username || user.username || 'User';
  const handle      = profile?.handle ?? deriveHandle(displayName);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <ProfileHeader
          name={displayName}
          handle={handle}
          location={profile?.location || ''}
          bio={profile?.bio || ''}
          recipes={profile?.recipes_count ?? 0}
          followers={profile?.followers_count ?? 0}
          following={profile?.following_count ?? 0}
        />

        <div className="mt-6 mb-8">
          <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
        </div>

        {tab === 'my-recipes'    && <MyRecipesTab userId={user.user_id} />}
        {tab === 'saved'         && <EmptyState message="Saved recipes will appear here." icon="🔖" />}
        {tab === 'liked'         && <EmptyState message="Liked recipes will appear here." icon="❤️" />}
        {tab === 'cook-log'      && <CookLogTab userId={user.user_id} />}
        {tab === 'flavor-profile'&& <FlavorProfileTab userId={user.user_id} />}
        {tab === 'royalties'     && <RoyaltiesTab userId={user.user_id} />}
      </div>
    </div>
  );
}

function deriveHandle(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '_');
}

function ProfileHeader({ name, handle, location, bio, recipes, followers, following }) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 flex items-start gap-6">
      <img
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
        alt={name}
        className="w-[120px] h-[120px] rounded-full bg-[#FAF8F5] shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-[26px] font-bold text-[#1A1A1A]">{name}</h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
            Edit Profile
          </button>
        </div>

        <div className="text-[13px] text-[#6B6B6B] mb-1.5">@{handle}</div>

        {location && (
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B] mb-1.5">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            {location}
          </div>
        )}

        {bio && <p className="text-[14px] text-[#1A1A1A] mb-4">{bio}</p>}

        <div className="flex items-start gap-8">
          <Stat number={recipes}   label="Recipes"   />
          <Stat number={followers} label="Followers" />
          <Stat number={following} label="Following" />
        </div>
      </div>
    </div>
  );
}

function Stat({ number, label }) {
  return (
    <div>
      <div className="text-[20px] font-bold text-[#1A1A1A] leading-tight">{number}</div>
      <div className="text-[12px] text-[#6B6B6B]">{label}</div>
    </div>
  );
}

function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex bg-[#F0EDE7] rounded-xl p-1 gap-1">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ' +
              (active
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A]')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function MyRecipesTab({ userId }) {
  const [recipes, setRecipes] = useState(null);

  useEffect(() => {
    getUserRecipes(userId)
      .then((data) => setRecipes(itemsOf(data)))
      .catch(() => setRecipes([]));
  }, [userId]);

  return <RecipeRowFromState recipes={recipes} empty="You haven't published a recipe yet." />;
}

function CookLogTab({ userId }) {
  const [recipes, setRecipes] = useState(null);

  useEffect(() => {
    getCookLog(userId)
      .then((data) => {
        // Cook log entries can come back as full recipe objects or as { recipe_id, ... }
        const list = itemsOf(data);
        const flattened = list.map((entry) => entry.recipe ?? entry);
        setRecipes(flattened);
      })
      .catch(() => setRecipes([]));
  }, [userId]);

  return <RecipeRowFromState recipes={recipes} empty="No cook log entries yet." />;
}

function RecipeRowFromState({ recipes, empty }) {
  if (recipes === null) return <LoadingSpinner size="lg" />;
  if (recipes.length === 0) return <EmptyState message={empty} icon="🍽️" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {recipes.map((r) => (
        <RecipeCard key={r.recipe_id} recipe={r} />
      ))}
    </div>
  );
}

function FlavorProfileTab({ userId }) {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newIng, setNewIng] = useState('');
  const [newScore, setNewScore] = useState(50);

  useEffect(() => {
    getFlavorProfile(userId)
      .then((data) => setItems(itemsOf(data)))
      .catch(() => setItems([]));
  }, [userId]);

  const tracked = items?.length ?? 0;
  const learned = items?.filter((i) => i.auto).length ?? 0;

  const add = async () => {
    if (!newIng) return;
    const next = [
      ...(items ?? []),
      { ingredient: newIng, category: '', score: Number(newScore), auto: false },
    ];
    setItems(next);
    setAdding(false);
    setNewIng('');
    setNewScore(50);
    try {
      await updateFlavorProfile(userId, { items: next });
    } catch {
      // already toasted by the interceptor
    }
  };

  const remove = async (i) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    try {
      await updateFlavorProfile(userId, { items: next });
    } catch {
      // already toasted by the interceptor
    }
  };

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} fill="#F5C518" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#1A1A1A]">Flavor Profile</h2>
            <p className="text-[12px] text-[#6B6B6B]">
              {tracked} ingredients tracked · {learned} learned automatically
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add
        </button>
      </div>

      <div className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-xl px-4 py-3 mb-5 flex items-start gap-2 text-[13px] text-[#6B6B6B]">
        <Info className="w-4 h-4 mt-0.5 text-[#9E9E9E] shrink-0" strokeWidth={1.5} />
        <p>
          Scores marked <span className="font-semibold text-[#1A1A1A]">Auto</span> are inferred
          from your cook logs. The higher the score, the more this ingredient influences your
          recipe recommendations.
        </p>
      </div>

      {adding && (
        <AddIngredientForm
          ingredient={newIng}
          onIngredientChange={setNewIng}
          score={newScore}
          onScoreChange={setNewScore}
          onSave={add}
          onCancel={() => { setAdding(false); setNewIng(''); setNewScore(50); }}
          existing={(items ?? []).map((i) => i.ingredient)}
        />
      )}

      {items === null ? (
        <LoadingSpinner size="lg" />
      ) : items.length === 0 ? (
        <EmptyState message="No flavor preferences yet — add one to nudge your recommendations." icon="✨" />
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <FlavorRow key={`${it.ingredient}-${i}`} item={it} onRemove={() => remove(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddIngredientForm({
  ingredient, onIngredientChange, score, onScoreChange,
  onSave, onCancel, existing,
}) {
  const available = INGREDIENT_PICK_LIST.filter((i) => !existing.includes(i));
  const label = scoreLabel(Number(score));

  return (
    <div className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-xl p-5 mb-5">
      <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-3">Add Ingredient Preference</h3>

      <select
        value={ingredient}
        onChange={(e) => onIngredientChange(e.target.value)}
        className="w-full px-3 py-2.5 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg bg-white focus:outline-none focus:border-[#1B3A2D] mb-4"
      >
        <option value="">Select an ingredient…</option>
        {available.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      <div className="text-[13px] text-[#1A1A1A] mb-2">
        Affinity Score: <span className="font-bold">{score}</span> — {label}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={score}
        onChange={(e) => onScoreChange(Number(e.target.value))}
        className="w-full accent-[#1B3A2D] mb-2"
      />
      <div className="flex justify-between text-[11px] text-[#6B6B6B] mb-4">
        <span>Dislike (0)</span>
        <span>Neutral (50)</span>
        <span>Love (100)</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!ingredient}
          className="px-4 py-1.5 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FlavorRow({ item, onRemove }) {
  const score = item.score;
  const tier = scoreTier(score);

  const barColor = tier === 'dislike' ? '#B71C1C' : '#1B3A2D';
  const pillCls =
    tier === 'dislike'
      ? 'bg-[#FEEBEE] text-[#B71C1C]'
      : 'bg-[#E8F1EC] text-[#1B5E20]';

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[14px] font-semibold text-[#1A1A1A]">{item.ingredient}</span>
          {item.auto && (
            <span className="px-1.5 py-0.5 bg-[#F0F0F0] text-[#6B6B6B] text-[11px] font-medium rounded">
              Auto
            </span>
          )}
        </div>
        {item.category && (
          <div className="text-[12px] text-[#9E9E9E]">{item.category}</div>
        )}
      </div>

      <div className="w-[180px] h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden shrink-0">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>

      <span className="w-8 text-right text-[14px] font-semibold text-[#1A1A1A]">{score}</span>

      <span className={`px-2.5 py-0.5 rounded-md text-[12px] font-semibold ${pillCls}`}>
        {capitalize(tier)}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#B71C1C] hover:bg-[#FFEBEE] transition-colors shrink-0"
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function RoyaltiesTab({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getUserRoyalties(userId)
      .then(setData)
      .catch(() => setData({}));
  }, [userId]);

  if (data === null) {
    return <LoadingSpinner size="lg" />;
  }

  const totalPoints = data.total_points ?? 0;
  const orders      = data.orders_linked ?? 0;
  const topRecipe   = data.top_recipe ?? '—';
  const performance = itemsOf(data.performance);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Royalty Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Total Points"   value={totalPoints} />
          <KpiCard label="Orders Linked"  value={orders}      />
          <KpiCard label="Top Recipe"     value={topRecipe}   />
        </div>
      </div>

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-2">Recipe Performance</h3>
        <p className="text-[13px] text-[#6B6B6B] mb-4">
          Per-recipe views, orders, and rating averages.
        </p>
        {performance.length === 0 ? (
          <EmptyState
            message="Performance reports will populate once recipes have order activity."
            icon="📈"
          />
        ) : (
          <ul className="divide-y divide-[#EBEBEB] text-[14px]">
            {performance.map((row) => (
              <li key={row.recipe_id} className="flex items-center justify-between py-3">
                <span className="font-medium text-[#1A1A1A]">{row.title}</span>
                <span className="text-[#6B6B6B]">
                  {row.views ?? 0} views · {row.orders ?? 0} orders · ★ {row.avg_rating ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-xl p-4">
      <div className="text-[12px] text-[#6B6B6B] mb-1">{label}</div>
      <div className="text-[24px] font-bold text-[#1A1A1A]">{value}</div>
    </div>
  );
}

function scoreTier(s) {
  if (s < 50) return 'dislike';
  if (s < 80) return 'like';
  return 'love';
}

function scoreLabel(s) {
  if (s < 25)   return 'Dislike';
  if (s < 50)   return 'Mild Dislike';
  if (s === 50) return 'Neutral';
  if (s < 75)   return 'Like';
  return 'Love';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function itemsOf(data) {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}
