import { useSearchParams } from 'react-router-dom';
import { Clock, TrendingUp, Star, ChefHat } from 'lucide-react';
import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  DIFFICULTY_OPTIONS,
  CATEGORY_OPTIONS,
} from '../constants/tags';

const COOKING_TIME_OPTIONS = [
  { label: 'Under 30 min', value: 'under-30' },
  { label: '30-60 min',    value: '30-60'    },
  { label: 'Over 60 min',  value: 'over-60'  },
];

const RATING_OPTIONS = [
  { label: '4+ Stars',   value: '4'   },
  { label: '4.5+ Stars', value: '4.5' },
];

export default function FilterSidebar({ filters, onChange }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const update = (patch) => {
    const next = { ...filters, ...patch };
    onChange?.(next);

    const p = new URLSearchParams(searchParams);
    setOrDelete(p, 'cookingTime', next.cookingTime);
    setOrDelete(p, 'difficulty',  next.difficulty);
    setOrDelete(p, 'minRating',   next.minRating);
    setOrDelete(p, 'ingredient',  next.ingredient);
    setOrDelete(p, 'cuisine',     next.cuisine);
    setOrDelete(p, 'category',    next.category);
    setOrDelete(p, 'dietary',     next.dietary?.length ? next.dietary.join(',') : '');
    p.delete('page');
    setSearchParams(p, { replace: true });
  };

  const toggleDietary = (value) => {
    const current = filters.dietary ?? [];
    update({
      dietary: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  return (
    <aside className="bg-[#FAEFCB] border border-[#F0E2A8] rounded-2xl p-6 space-y-6">
      <Group icon={<Clock className="w-4 h-4" strokeWidth={1.5} />} label="Cooking Time">
        <PillRow
          value={filters.cookingTime}
          onChange={(v) => update({ cookingTime: v })}
          options={COOKING_TIME_OPTIONS}
          prefix={<Clock className="w-3.5 h-3.5" strokeWidth={1.5} />}
        />
      </Group>

      <Group icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />} label="Difficulty">
        <PillRow
          value={filters.difficulty}
          onChange={(v) => update({ difficulty: v })}
          options={DIFFICULTY_OPTIONS}
        />
      </Group>

      <Group icon={<Star className="w-4 h-4" strokeWidth={1.5} />} label="Minimum Rating">
        <PillRow
          value={filters.minRating}
          onChange={(v) => update({ minRating: v })}
          options={RATING_OPTIONS}
          allLabel="All Ratings"
          prefix={<Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />}
        />
      </Group>

      <Group icon={<ChefHat className="w-4 h-4" strokeWidth={1.5} />} label="Search by Ingredient">
        <input
          type="text"
          value={filters.ingredient ?? ''}
          onChange={(e) => update({ ingredient: e.target.value })}
          placeholder="e.g., chicken, tomatoes, basil..."
          className="w-full max-w-sm px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] bg-white focus:outline-none focus:border-[#1B3A2D] transition-colors"
        />
      </Group>

      <Group label="Dietary Preferences">
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map((o) => {
            const active = (filters.dietary ?? []).includes(o.value);
            return (
              <PillButton key={o.value} active={active} onClick={() => toggleDietary(o.value)}>
                {o.label}
              </PillButton>
            );
          })}
        </div>
      </Group>

      <Group label="Cuisine">
        <PillRow
          value={filters.cuisine}
          onChange={(v) => update({ cuisine: v })}
          options={CUISINE_OPTIONS}
        />
      </Group>

      <Group label="Category">
        <PillRow
          value={filters.category}
          onChange={(v) => update({ category: v })}
          options={CATEGORY_OPTIONS}
        />
      </Group>
    </aside>
  );
}

function setOrDelete(p, key, value) {
  if (value) p.set(key, value);
  else p.delete(key);
}

function Group({ icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-[#1A1A1A]">
        {icon}
        <span className="text-[14px] font-bold">{label}</span>
      </div>
      {children}
    </div>
  );
}

function PillRow({ value, onChange, options, prefix, allLabel = 'All' }) {
  const isAll = !value;
  return (
    <div className="flex flex-wrap gap-2">
      <PillButton active={isAll} onClick={() => onChange('')}>
        {allLabel}
      </PillButton>
      {options.map((o) => (
        <PillButton
          key={o.value}
          active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {prefix}
          {o.label}
        </PillButton>
      ))}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors';
  const cls = active
    ? `${base} bg-[#1B3A2D] text-white border-[#1B3A2D]`
    : `${base} bg-white text-[#1A1A1A] border-[#D0D0D0] hover:border-[#1B3A2D]`;

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
