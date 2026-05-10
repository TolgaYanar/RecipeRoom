import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, ChefHat, Store, FileText, Sparkles, TrendingUp,
  Plus, Trash2, Check, X, Heart, MessageCircle, BarChart3,
  UserPlus, UtensilsCrossed, Star, ShoppingCart, ShieldAlert,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ManageUserModal from '../components/ManageUserModal';
import { useToast } from '../context/ToastContext';
import { getRecipes } from '../api/recipes';
import {
  getPendingChefs, approveChef, rejectChef,
  getAdminUsers,
  getPendingSuppliers, approveSupplier, rejectSupplier,
  getAdminHighlights, createAdminHighlight, updateAdminHighlight, deleteAdminHighlight,
  getAdminActivity,
  getAllTags, getAllBadges,
  getAdminChallenges, getAdminChallenge,
} from '../api/admin';
import {
  createChallenge, updateChallenge,
} from '../api/challenges';

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'users',         label: 'User Management' },
  { id: 'verifications', label: 'Verifications' },
  { id: 'recipes',       label: 'Recipe Management' },
  { id: 'highlights',    label: 'Featured Selections' },
  { id: 'challenges',    label: 'Challenges' },
  { id: 'analytics',     label: 'Analytics' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [pendingChefs,     setPendingChefs]     = useState(null);
  const [pendingSuppliers, setPendingSuppliers] = useState(null);
  const [users,            setUsers]            = useState(null);
  // bumped on approve/reject so the Overview + Verifications tabs refresh
  const [verifKey, setVerifKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPendingChefs().catch(() => []),
      getPendingSuppliers().catch(() => []),
      getAdminUsers().catch(() => []),
    ]).then(([chefs, suppliers, allUsers]) => {
      if (cancelled) return;
      setPendingChefs(itemsOf(chefs));
      setPendingSuppliers(itemsOf(suppliers));
      setUsers(itemsOf(allUsers));
    });
    return () => { cancelled = true; };
  }, [verifKey]);

  const reloadVerifs = () => setVerifKey((k) => k + 1);
  const pendingCount = (pendingChefs?.length ?? 0) + (pendingSuppliers?.length ?? 0);

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <Header />
      <Tabs value={tab} onChange={setTab} pendingCount={pendingCount} />

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {tab === 'overview'      && (
          <OverviewTab
            users={users ?? []}
            pendingChefs={pendingChefs ?? []}
            pendingSuppliers={pendingSuppliers ?? []}
            onReviewVerifications={() => setTab('verifications')}
          />
        )}
        {tab === 'users'         && <UserManagementTab users={users} onChange={reloadVerifs} />}
        {tab === 'verifications' && (
          <VerificationsTab
            chefs={pendingChefs}
            suppliers={pendingSuppliers}
            onChange={reloadVerifs}
          />
        )}
        {tab === 'recipes'       && <RecipeManagementTab />}
        {tab === 'highlights'    && <FeaturedSelectionsTab />}
        {tab === 'challenges'    && <ChallengeManagementTab />}
        {tab === 'analytics'     && <AnalyticsTab />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-[#1B3A2D] text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#F5C518]/15 border border-[#F5C518]/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-[#F5C518]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Administrator Dashboard</h1>
          <p className="text-[14px] text-white/70 mt-0.5">
            Manage users, verifications, recipes, featured selections, and platform analytics
          </p>
        </div>
      </div>
    </div>
  );
}

function Tabs({ value, onChange, pendingCount }) {
  return (
    <div className="bg-white border-b border-[#EBEBEB]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {TABS.map((t) => {
            const active = value === t.id;
            const showBadge = t.id === 'verifications' && pendingCount > 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={
                  'relative shrink-0 px-4 py-4 text-[14px] font-semibold transition-colors ' +
                  (active ? 'text-[#1A1A1A]' : 'text-[#6B6B6B] hover:text-[#1A1A1A]')
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.label}
                  {showBadge && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#F5C518] text-[#1A1A1A] text-[10px] font-bold rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#1B3A2D]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_ICONS = {
  new_user:    <UserPlus        className="w-4 h-4 text-[#1B3A2D]"  strokeWidth={1.5} />,
  cook_log:    <UtensilsCrossed className="w-4 h-4 text-[#F5C518]"  strokeWidth={1.5} />,
  review:      <Star            className="w-4 h-4 text-[#F5A623]"  strokeWidth={1.5} />,
  order:       <ShoppingCart    className="w-4 h-4 text-[#A8893E]"  strokeWidth={1.5} />,
  moderation:  <ShieldAlert     className="w-4 h-4 text-[#B71C1C]"  strokeWidth={1.5} />,
};

function OverviewTab({ users, pendingChefs, pendingSuppliers, onReviewVerifications }) {
  const [recipeMeta, setRecipeMeta] = useState(null);
  const [activity,   setActivity]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getRecipes({ limit: 1 }).catch(() => null),
      getAdminActivity().catch(() => []),
    ]).then(([d, events]) => {
      if (cancelled) return;
      setRecipeMeta(d ?? null);
      setActivity(Array.isArray(events) ? events : []);
    });
    return () => { cancelled = true; };
  }, []);

  const totalRecipes  = recipeMeta?.total ?? (Array.isArray(recipeMeta) ? recipeMeta.length : 0);
  const verifiedChefs = users.filter((u) => u.user_type === 'Verified_Chef').length;
  const supplierCount = users.filter((u) => u.user_type === 'Local_Supplier').length;

  return (
    <div className="space-y-6">
      <h2 className="text-[20px] font-bold text-[#1A1A1A]">Platform Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<Users    className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}  label="Total Users"     value={String(users.length)} />
        <Kpi icon={<ChefHat  className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} />}  label="Verified Chefs"  value={String(verifiedChefs)} />
        <Kpi icon={<Store    className="w-5 h-5 text-[#A8893E]" strokeWidth={1.5} />}  label="Local Suppliers" value={String(supplierCount)} />
        <Kpi icon={<FileText className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}  label="Total Recipes"   value={String(totalRecipes)} />
      </div>

      {(pendingChefs.length + pendingSuppliers.length) > 0 && (
        <div className="bg-[#FFF7DC] border-2 border-[#F5C518] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#A8893E] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Pending Verification Requests</h3>
              <p className="text-[13px] text-[#6B6B6B] mt-0.5 mb-3">
                You have {pendingChefs.length} chef verification{pendingChefs.length === 1 ? '' : 's'} and {pendingSuppliers.length} supplier verification{pendingSuppliers.length === 1 ? '' : 's'} awaiting review.
              </p>
              <button
                type="button"
                onClick={onReviewVerifications}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5C518] text-[#1A1A1A] rounded-lg text-[13px] font-semibold hover:bg-[#E0B515]"
              >
                Review Verifications
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Recent Activity</h3>
        {activity === null ? (
          <LoadingSpinner size="sm" />
        ) : activity.length === 0 ? (
          <p className="text-[13px] text-[#9E9E9E]">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {activity.map((ev, i) => (
              <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center shrink-0 mt-0.5">
                  {ACTIVITY_ICONS[ev.type] ?? <FileText className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1A1A1A]">
                    <span className="font-semibold">{ev.actor}</span>
                    {' '}{ev.detail}
                    {ev.subject && <span className="font-semibold"> "{ev.subject}"</span>}
                  </p>
                  <p className="text-[11px] text-[#9E9E9E] mt-0.5">{formatDate(ev.ts)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center mb-4">
        {icon}
      </div>
      <div className="text-[28px] font-bold text-[#1A1A1A] leading-tight">{value}</div>
      <div className="text-[13px] text-[#6B6B6B] mt-0.5">{label}</div>
    </div>
  );
}

function UserManagementTab({ users, onChange }) {
  const [managing, setManaging] = useState(null);

  if (users === null) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-5">User Management</h2>

      {users.length === 0 ? (
        <EmptyState icon="👥" message="No users in the system." />
      ) : (
        <div className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FAF8F5] border-b border-[#EBEBEB]">
              <tr className="text-left text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBEB]">
              {users.map((u) => (
                <UserRow key={u.user_id} user={u} onManage={() => setManaging(u)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {managing && (
        <ManageUserModal
          user={managing}
          onClose={() => setManaging(null)}
          onChanged={onChange}
        />
      )}
    </div>
  );
}

function UserRow({ user: u, onManage }) {
  const name   = u.username || 'Unknown';
  const handle = deriveHandle(name);
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
            alt={name}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">{name}</div>
            <div className="text-[12px] text-[#6B6B6B]">@{handle}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><UserTypePill type={u.user_type} /></td>
      <td className="px-5 py-4 text-[13px] text-[#6B6B6B]">{formatDate(u.join_date)}</td>
      <td className="px-5 py-4">
        <span className="px-2 py-0.5 bg-[#E8F1EC] text-[#1B5E20] text-[11px] font-semibold rounded-md">
          Active
        </span>
      </td>
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onManage}
          className="text-[13px] text-[#1B3A2D] font-semibold hover:underline"
        >
          Manage
        </button>
      </td>
    </tr>
  );
}

function UserTypePill({ type }) {
  const cls = {
    Verified_Chef:  'bg-[#FFF7DC] text-[#8A6E00]',
    Local_Supplier: 'bg-[#E8F1EC] text-[#1B5E20]',
    Administrator:  'bg-[#EDE7F6] text-[#4527A0]',
    Home_Cook:      'bg-[#F5F5F5] text-[#1A1A1A]',
  }[type] || 'bg-[#F5F5F5] text-[#6B6B6B]';
  const label = type ? type.replace(/_/g, ' ') : '—';
  return (
    <span className={`px-2.5 py-1 rounded-md text-[12px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function VerificationsTab({ chefs, suppliers, onChange }) {
  if (chefs === null || suppliers === null) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-5">Verification Requests</h2>

      <section className="mb-8">
        <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-[#F5C518]" strokeWidth={1.5} />
          Chef Verification Requests ({chefs.length})
        </h3>

        {chefs.length === 0 ? (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center text-[13px] text-[#6B6B6B]">
            No chef requests waiting for review.
          </div>
        ) : (
          <ul className="space-y-3">
            {chefs.map((c) => (
              <PartyCard
                key={c.user_id ?? c.id}
                party={c}
                approve={approveChef}
                reject={rejectChef}
                approveMsg="Chef approved"
                rejectMsg="Chef rejected"
                onChange={onChange}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-[#A8893E]" strokeWidth={1.5} />
          Supplier Verification Requests ({suppliers.length})
        </h3>

        {suppliers.length === 0 ? (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center text-[13px] text-[#6B6B6B]">
            No supplier requests waiting for review.
          </div>
        ) : (
          <ul className="space-y-3">
            {suppliers.map((s) => (
              <PartyCard
                key={s.user_id ?? s.id}
                party={{
                  ...s,
                  // suppliers carry a business name; surface it as the bio line
                  bio: s.business_name ? `${s.business_name}${s.address ? ` · ${s.address}` : ''}` : s.bio,
                }}
                approve={approveSupplier}
                reject={rejectSupplier}
                approveMsg="Supplier approved"
                rejectMsg="Supplier rejected"
                onChange={onChange}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// generic verification card — used for both chef and supplier review rows
function PartyCard({ party: p, approve, reject, approveMsg, rejectMsg, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn(p.user_id ?? p.id);
      toast.success(msg);
      onChange();
    } catch {
      // already toasted by the interceptor
      setBusy(false);
    }
  };

  const name   = p.username || p.name || 'Unknown';
  const handle = p.handle ?? deriveHandle(name);
  const joined = p.join_date ?? p.requested_at;

  return (
    <li className="bg-white border border-[#EBEBEB] rounded-2xl p-5 flex items-start gap-4">
      <img
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
        alt={name}
        className="w-12 h-12 rounded-full bg-[#FAF8F5] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold text-[#1A1A1A]">{name}</div>
        <div className="text-[13px] text-[#6B6B6B]">@{handle}</div>
        {p.bio && <p className="text-[13px] text-[#1A1A1A] mt-2">{p.bio}</p>}
        <div className="text-[12px] text-[#6B6B6B] mt-2">
          {p.contact_number ? `📞 ${p.contact_number} · ` : ''}
          {joined ? `Joined: ${formatDate(joined)}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(approve, approveMsg)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] disabled:opacity-60"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2} />
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(reject, rejectMsg)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B71C1C] text-[#B71C1C] rounded-lg text-[13px] font-semibold hover:bg-[#FFEBEE] disabled:opacity-60"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
          Reject
        </button>
      </div>
    </li>
  );
}

function RecipeManagementTab() {
  const toast = useToast();
  const [recipes, setRecipes]       = useState(null);
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getRecipes({ limit: 50 }).catch(() => null),
      getAdminHighlights().catch(() => []),
    ]).then(([rs, hs]) => {
      if (cancelled) return;
      setRecipes(itemsOf(rs));
      setHighlights(itemsOf(hs));
    });
    return () => { cancelled = true; };
  }, []);

  const moveTo = async (recipeId, highlightId) => {
    const target = highlights.find((h) =>
      (h.selection_id ?? h.id ?? h.highlight_id) === highlightId
    );
    if (!target) return;
    // append the recipe id, dropping any existing entry to avoid duplicates
    const recipeIds = (target.recipe_ids ?? target.recipes?.map((r) => r.recipe_id ?? r.id) ?? [])
      .filter((id) => id !== recipeId)
      .concat([recipeId]);
    try {
      await updateAdminHighlight(highlightId, { recipe_ids: recipeIds });
      toast.success('Recipe added to selection');
    } catch {
      // already toasted by the interceptor
    }
  };

  if (recipes === null) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-5">Recipe Management</h2>

      <div className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FAF8F5] border-b border-[#EBEBEB]">
            <tr className="text-left text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
              <th className="px-5 py-3">Recipe</th>
              <th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Engagement</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBEB]">
            {recipes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#9E9E9E]">
                  No recipes yet.
                </td>
              </tr>
            ) : recipes.map((r) => (
              <RecipeRow
                key={r.recipe_id ?? r.id}
                recipe={r}
                highlights={highlights}
                onMoveTo={moveTo}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecipeRow({ recipe: r, highlights, onMoveTo }) {
  const id = r.recipe_id ?? r.id;
  return (
    <tr>
      <td className="px-5 py-4">
        <Link to={`/recipes/${id}`} className="flex items-center gap-3 group">
          <img
            src={r.thumbnail_url || r.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.title || 'R')}`}
            alt=""
            className="w-12 h-12 rounded-lg object-cover bg-[#FAF8F5]"
          />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A] truncate group-hover:underline">{r.title}</div>
            {r.cuisine && <div className="text-[12px] text-[#6B6B6B]">{capitalize(r.cuisine)}</div>}
          </div>
        </Link>
      </td>
      <td className="px-5 py-4 text-[13px] text-[#1A1A1A]">{r.publisher_name ?? '—'}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-1">
          {(r.tags ?? []).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-[#F5F5F5] text-[#1A1A1A] text-[11px] font-medium rounded-md"
            >
              {t}
            </span>
          ))}
        </div>
      </td>
      <td className="px-5 py-4">
        <Link
          to={`/recipes/${id}`}
          className="inline-flex items-center gap-3 text-[12px] text-[#6B6B6B] hover:text-[#1B3A2D]"
        >
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-[#B71C1C]" strokeWidth={1.5} />
            {r.like_count ?? 0}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
            {r.comment_count ?? 0}
          </span>
        </Link>
      </td>
      <td className="px-5 py-4">
        <select
          defaultValue=""
          onChange={(e) => {
            const hid = Number(e.target.value);
            if (hid) onMoveTo(id, hid);
            e.target.value = '';
          }}
          className="text-[13px] border border-[#D0D0D0] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#1B3A2D]"
        >
          <option value="">Move to…</option>
          {highlights.map((h) => {
            const hid = h.selection_id ?? h.id ?? h.highlight_id;
            return (
              <option key={hid} value={hid}>
                {h.selection_type ?? h.title ?? h.name}
              </option>
            );
          })}
        </select>
      </td>
    </tr>
  );
}

function FeaturedSelectionsTab() {
  const toast = useToast();
  const [highlights, setHighlights] = useState(null);
  const [recipes, setRecipes]       = useState([]);
  const [creating, setCreating]     = useState(false);
  const [reloadKey, setReloadKey]   = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminHighlights().catch(() => []),
      getRecipes({ limit: 50 }).catch(() => null),
    ]).then(([hs, rs]) => {
      if (cancelled) return;
      setHighlights(itemsOf(hs));
      setRecipes(itemsOf(rs));
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const remove = async (id) => {
    try {
      await deleteAdminHighlight(id);
      toast.success('Selection deleted');
      reload();
    } catch {
      // already toasted by the interceptor
    }
  };

  const removeRecipe = async (selectionId, recipeId) => {
    const target = highlights.find((h) =>
      (h.selection_id ?? h.id ?? h.highlight_id) === selectionId
    );
    if (!target) return;
    const remaining = (target.recipes ?? [])
      .map((r) => r.recipe_id ?? r.id)
      .filter((rid) => rid !== recipeId);
    try {
      await updateAdminHighlight(selectionId, { recipe_ids: remaining });
      reload();
    } catch {
      // already toasted by the interceptor
    }
  };

  if (highlights === null) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <header className="mb-5">
        <h2 className="text-[20px] font-bold text-[#1A1A1A]">Featured Selections</h2>
        <p className="text-[13px] text-[#6B6B6B] mt-1">
          Curate editorial recipe collections that appear on the home page. Each selection is
          linked to recipes via the <span className="font-semibold">Highlights</span> table.
        </p>
      </header>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-bold text-[#1A1A1A]">Featured Selections</h3>
          <p className="text-[12px] text-[#6B6B6B]">Curate recipe collections displayed on the home page</p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Selection
          </button>
        )}
      </div>

      {creating && (
        <NewSelectionForm
          recipes={recipes}
          onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); }}
        />
      )}

      {highlights.length === 0 ? (
        <EmptyState message="No featured selections yet." icon="✨" />
      ) : (
        <ul className="space-y-3">
          {highlights.map((h) => (
            <HighlightRow
              key={h.selection_id ?? h.id ?? h.highlight_id}
              highlight={h}
              onDelete={remove}
              onRemoveRecipe={removeRecipe}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HighlightRow({ highlight: h, onDelete, onRemoveRecipe }) {
  const id = h.selection_id ?? h.id ?? h.highlight_id;
  const recipes = h.recipes ?? [];
  const active  = h.active ?? h.is_active;

  return (
    <li className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[15px] font-bold text-[#1A1A1A]">{h.selection_type ?? h.title ?? h.name}</h4>
            <span
              className={
                'px-2 py-0.5 rounded-md text-[11px] font-semibold ' +
                (active ? 'bg-[#E8F1EC] text-[#1B5E20]' : 'bg-[#F0F0F0] text-[#6B6B6B]')
              }
            >
              {active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-[12px] text-[#6B6B6B]">
            {formatDate(h.start_date)} → {formatDate(h.end_date)} · {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#B71C1C] hover:bg-[#FFEBEE]"
          aria-label="Delete selection"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {recipes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipes.map((r) => {
            const rid = r.recipe_id ?? r.id;
            return (
              <span
                key={rid}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF8F5] border border-[#EBEBEB] rounded-md text-[12px] text-[#1A1A1A] group"
              >
                <Sparkles className="w-3 h-3 text-[#F5C518]" strokeWidth={1.5} />
                {r.title}
                <button
                  type="button"
                  onClick={() => onRemoveRecipe?.(id, rid)}
                  className="ml-1 text-[#9E9E9E] hover:text-[#B71C1C]"
                  aria-label={`Remove ${r.title} from selection`}
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}

function NewSelectionForm({ recipes, onCancel, onCreated }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(today);
  const [end,   setEnd]   = useState(today);
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  const togglePick = (id) =>
    setPicked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const create = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await createAdminHighlight({
        selection_type: title.trim(),
        start_date:     start,
        end_date:       end,
        recipe_ids:     picked,
      });
      toast.success('Selection created');
      onCreated();
    } catch {
      // already toasted by the interceptor
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#1B3A2D] rounded-2xl p-5 mb-4">
      <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Create New Selection</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="Collection Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. This Week's Picks"
            className={INPUT}
          />
        </Field>
        <Field label="Start Date" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="End Date" required>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>

      <div className="mb-4">
        <div className="text-[13px] font-semibold text-[#1A1A1A] mb-2">
          Select Recipes ({picked.length} selected)
        </div>
        {recipes.length === 0 ? (
          <div className="text-[13px] text-[#9E9E9E] py-4 text-center border border-dashed border-[#D0D0D0] rounded-lg">
            No recipes available to add.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[280px] overflow-auto">
            {recipes.map((r) => {
              const id = r.recipe_id ?? r.id;
              const active = picked.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePick(id)}
                  className={
                    'p-3 border rounded-lg text-left transition-colors ' +
                    (active ? 'border-[#1B3A2D] bg-[#F5F8F6]' : 'border-[#EBEBEB] hover:border-[#D0D0D0]')
                  }
                >
                  <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">{r.title}</div>
                  <div className="text-[12px] text-[#6B6B6B] truncate">{r.publisher_name ?? '—'}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={create}
          disabled={saving || !title.trim()}
          className="inline-flex items-center px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create Selection'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const TOP_RECIPES = [
  { title: 'Spaghetti Pomodoro',        author: 'chef_marco', orders: 14, cook_logs: 11, avg_rating: 5.0 },
  { title: 'Strawberry Yogurt Smoothie',author: 'chef_aisha', orders: 11, cook_logs: 9,  avg_rating: 5.0 },
  { title: 'Quinoa Power Bowl',          author: 'chef_aisha', orders: 9,  cook_logs: 7,  avg_rating: 4.0 },
  { title: 'Tomato Basil Soup',          author: 'chef_marco', orders: 7,  cook_logs: 6,  avg_rating: 4.5 },
  { title: 'Vegan Banana Oat Pancakes',  author: 'chef_aisha', orders: 6,  cook_logs: 8,  avg_rating: 4.3 },
];

function ChallengeManagementTab() {
  const toast = useToast();
  const [list,    setList]    = useState(null);
  const [tags,    setTags]    = useState([]);
  const [badges,  setBadges]  = useState([]);
  const [reload,  setReload]  = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminChallenges().catch(() => []),
      getAllTags().catch(() => []),
      getAllBadges().catch(() => []),
    ])
      .then(([cs, ts, bs]) => {
        if (cancelled) return;
        setList(itemsOf(cs));
        setTags(itemsOf(ts));
        setBadges(itemsOf(bs));
      });
    return () => { cancelled = true; };
  }, [reload]);

  const closeChallenge = async (id) => {
    try {
      // Mark closed by ending it today; backend has no DELETE.
      await updateChallenge(id, { end_date: new Date().toISOString().slice(0, 10) });
      toast.success('Challenge closed');
      setReload((k) => k + 1);
    } catch {
      // already toasted by the interceptor
    }
  };

  if (list === null) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <header className="mb-5">
        <h2 className="text-[20px] font-bold text-[#1A1A1A]">Challenges</h2>
      </header>

      <div className="flex justify-end mb-3">
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Challenge
          </button>
        )}
      </div>

      {creating && (
        <NewChallengeForm
          tags={tags}
          badges={badges}
          onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); setReload((k) => k + 1); }}
        />
      )}

      {list.length === 0 ? (
        <EmptyState message="No challenges yet." icon="🏆" />
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <ChallengeRow
              key={c.challenge_id}
              challenge={c}
              onClose={() => closeChallenge(c.challenge_id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ChallengeRow({ challenge: c, onClose }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!open || detail) return;
    getAdminChallenge(c.challenge_id).then(setDetail).catch(() => setDetail({}));
  }, [open, c.challenge_id, detail]);

  return (
    <li className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            {open
              ? <ChevronUp className="w-4 h-4 text-[#6B6B6B]" />
              : <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />}
            <h4 className="text-[15px] font-bold text-[#1A1A1A] truncate">{c.title}</h4>
            <span className={
              'px-2 py-0.5 rounded-md text-[11px] font-semibold ' +
              (c.has_ended ? 'bg-[#F0F0F0] text-[#6B6B6B]' : 'bg-[#E8F1EC] text-[#1B5E20]')
            }>
              {c.has_ended ? 'Ended' : 'Active'}
            </span>
            {c.required_tag_name && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7DC] text-[#8A6E00]">
                {c.required_tag_name}
              </span>
            )}
          </div>
          {c.description && <div className="text-[13px] text-[#6B6B6B] mb-1">{c.description}</div>}
          <div className="text-[12px] text-[#9E9E9E]">
            {formatDate(c.start_date)} → {formatDate(c.end_date)} · {c.participant_count} participant{c.participant_count === 1 ? '' : 's'}
          </div>
        </button>
        {!c.has_ended && (
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold text-[#B71C1C] hover:underline shrink-0"
          >
            Close now
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-[#EBEBEB] pt-3">
          {detail === null ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              {detail.badge_name && (
                <div className="mb-3 px-3 py-2 bg-[#FFF7DC] border border-[#F0E2A8] rounded-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F5C518]" strokeWidth={1.5} />
                  <div>
                    <div className="text-[13px] font-semibold text-[#1A1A1A]">Badge prize: {detail.badge_name}</div>
                    {detail.badge_description && (
                      <div className="text-[11px] text-[#6B6B6B]">{detail.badge_description}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-[12px] font-semibold text-[#1A1A1A] mb-2">
                Leaderboard ({(detail.leaderboard ?? []).length})
              </div>
              {(detail.leaderboard ?? []).length === 0 ? (
                <div className="text-[12px] text-[#9E9E9E]">No participants yet.</div>
              ) : (
                <ul className="space-y-1.5">
                  {detail.leaderboard.map((p, i) => (
                    <li key={p.user_id} className="flex items-center justify-between text-[13px]">
                      <span className="text-[#1A1A1A]">
                        <span className="text-[#9E9E9E] mr-2">#{i + 1}</span>
                        {p.username}
                        {p.progress_status === 'Winner' && (
                          <span className="ml-2 px-2 py-0.5 bg-[#FFF7DC] text-[#8A6E00] text-[10px] font-semibold rounded">Winner</span>
                        )}
                      </span>
                      <span className="text-[#6B6B6B]">score {p.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function NewChallengeForm({ tags, badges, onCancel, onCreated }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const inOneWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [startDate, setStart]   = useState(today);
  const [endDate, setEnd]       = useState(inOneWeek);
  const [tagId, setTagId]       = useState(tags[0]?.tag_id ?? '');
  const [badgeMode, setBadgeMode] = useState('none'); // 'none' | 'existing' | 'new'
  const [badgeId, setBadgeId]   = useState('');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('');
  const [saving, setSaving]     = useState(false);

  const submit = async () => {
    if (!title.trim() || !tagId) {
      toast.error('Title and required tag are required');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    if (badgeMode === 'new') {
      if (!newBadgeName.trim() || !newBadgeIcon.trim()) {
        toast.error('New badge needs a name and icon URL');
        return;
      }
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: desc.trim() || null,
        start_date: startDate,
        end_date: endDate,
        required_tag_id: Number(tagId),
      };
      if (badgeMode === 'existing' && badgeId) {
        body.badge_id = Number(badgeId);
      } else if (badgeMode === 'new') {
        body.badge_name = newBadgeName.trim();
        body.badge_description = newBadgeDesc.trim() || null;
        body.badge_icon_url = newBadgeIcon.trim();
      }
      await createChallenge(body);
      toast.success(badgeMode === 'new' ? 'Challenge + badge created' : 'Challenge created');
      onCreated();
    } catch {
      // already toasted by the interceptor
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#1B3A2D] rounded-2xl p-5 mb-4">
      <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Create New Challenge</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Title" required>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mediterranean Week" className={INPUT} />
        </Field>
        <Field label="Required Tag" required>
          <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={INPUT}>
            <option value="">Select a tag…</option>
            {tags.map((t) => (
              <option key={t.tag_id} value={t.tag_id}>{t.tag_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Start Date" required>
          <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="End Date" required>
          <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="What cooks need to do…"
          className={INPUT}
        />
      </Field>
      <Field label="Badge prize">
        <div className="flex items-center gap-3 mb-2 text-[13px]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={badgeMode === 'none'} onChange={() => setBadgeMode('none')} />
            None
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={badgeMode === 'existing'} onChange={() => setBadgeMode('existing')} />
            Use existing
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={badgeMode === 'new'} onChange={() => setBadgeMode('new')} />
            Create new
          </label>
        </div>

        {badgeMode === 'existing' && (
          <select value={badgeId} onChange={(e) => setBadgeId(e.target.value)} className={INPUT}>
            <option value="">Select a badge…</option>
            {badges.map((b) => (
              <option key={b.badge_id} value={b.badge_id}>
                {b.name}{b.description ? ` — ${b.description}` : ''}
              </option>
            ))}
          </select>
        )}

        {badgeMode === 'new' && (
          <div className="space-y-2">
            <input
              type="text"
              value={newBadgeName}
              onChange={(e) => setNewBadgeName(e.target.value)}
              placeholder="Badge name (e.g. Pasta Master)"
              className={INPUT}
            />
            <input
              type="text"
              value={newBadgeIcon}
              onChange={(e) => setNewBadgeIcon(e.target.value)}
              placeholder="Icon URL (e.g. https://example.com/icons/pasta.png)"
              className={INPUT}
            />
            <input
              type="text"
              value={newBadgeDesc}
              onChange={(e) => setNewBadgeDesc(e.target.value)}
              placeholder="Description (optional)"
              className={INPUT}
            />
          </div>
        )}
      </Field>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 hover:bg-[#142B22]"
        >
          {saving ? 'Saving…' : 'Create Challenge'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div>
      <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-5">Platform Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AnalyticsCard
          icon={<TrendingUp className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}
          title="User Growth"
          value="+8"
          subtitle="Total registered users on the platform"
        />
        <AnalyticsCard
          icon={<BarChart3 className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} />}
          title="Recipe Engagement"
          value="70%"
          subtitle="Recipes with at least one cook log"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticsCard
          icon={<FileText className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}
          title="Total Orders"
          value="47"
          subtitle="Orders placed across all recipes"
        />
        <AnalyticsCard
          icon={<ChefHat className="w-5 h-5 text-[#F5C518]" strokeWidth={1.5} />}
          title="Cook Logs"
          value="41"
          subtitle="Recipes cooked and logged by users"
        />
        <AnalyticsCard
          icon={<Store className="w-5 h-5 text-[#A8893E]" strokeWidth={1.5} />}
          title="Active Suppliers"
          value="2"
          subtitle="Suppliers with in-stock inventory"
        />
      </div>

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Top Performing Recipes</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider border-b border-[#EBEBEB]">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Recipe</th>
              <th className="pb-3 pr-4">Author</th>
              <th className="pb-3 pr-4">Orders</th>
              <th className="pb-3 pr-4">Cook Logs</th>
              <th className="pb-3">Avg Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBEB]">
            {TOP_RECIPES.map((r, i) => (
              <tr key={r.title}>
                <td className="py-3 pr-4 text-[13px] font-bold text-[#6B6B6B]">{i + 1}</td>
                <td className="py-3 pr-4 text-[14px] font-semibold text-[#1A1A1A]">{r.title}</td>
                <td className="py-3 pr-4 text-[13px] text-[#6B6B6B]">{r.author}</td>
                <td className="py-3 pr-4 text-[13px] text-[#1A1A1A] font-medium">{r.orders}</td>
                <td className="py-3 pr-4 text-[13px] text-[#1A1A1A] font-medium">{r.cook_logs}</td>
                <td className="py-3 text-[13px] font-semibold text-[#F5A623]">★ {r.avg_rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsCard({ icon, title, value, subtitle }) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-[15px] font-bold text-[#1A1A1A]">{title}</h3>
      </div>
      <div className="text-[36px] font-bold text-[#1A1A1A] leading-tight">{value}</div>
      <div className="text-[13px] text-[#6B6B6B] mt-1">{subtitle}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">
        {label}{required && <span className="text-[#B71C1C] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  'w-full px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] bg-white';

function deriveHandle(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '_');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function prettyCategory(c) {
  return c ? c.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : '';
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString();
}

function itemsOf(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}
