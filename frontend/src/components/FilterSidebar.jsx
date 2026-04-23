import { useSearchParams } from 'react-router-dom';
import { CUISINE_OPTIONS, DIET_OPTIONS, DIFFICULTY_OPTIONS } from '../constants/tags';

export default function FilterSidebar({ filters, onChange }) {
  const [, setSearchParams] = useSearchParams();

  const update = (patch) => {
    const next = { ...filters, ...patch };
    onChange(next);
    const params = new URLSearchParams();
    if (next.cuisine)         params.set('cuisine', next.cuisine);
    if (next.difficulty)      params.set('difficulty', next.difficulty);
    if (next.dietary?.length) params.set('dietary', next.dietary.join(','));
    if (next.maxTime)         params.set('maxTime', next.maxTime);
    if (next.minRating)       params.set('minRating', next.minRating);
    setSearchParams(params, { replace: true });
  };

  const toggleDietary = (value) => {
    const current = filters.dietary ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    update({ dietary: next });
  };

  const hasActive =
    filters.cuisine || filters.difficulty || filters.dietary?.length ||
    filters.maxTime || filters.minRating;

  const pillBase = 'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all';
  const active   = `${pillBase} bg-[#1B3A2D] border-[#1B3A2D] text-white`;
  const inactive = `${pillBase} bg-white border-[#D0D0D0] text-[#1A1A1A] hover:border-[#1B3A2D]`;

  return (
    <aside className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-xl p-5 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold text-[#1A1A1A]">Filters</span>
        {hasActive && (
          <button
            onClick={() => update({ cuisine: '', difficulty: '', dietary: [], maxTime: '', minRating: '' })}
            className="text-[13px] font-semibold text-[#1B3A2D] hover:text-[#F5C518] transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Cuisine */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Cuisine
        </label>
        <select
          value={filters.cuisine ?? ''}
          onChange={e => update({ cuisine: e.target.value })}
          className="w-full px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg bg-white focus:outline-none focus:border-[#1B3A2D] transition-colors"
        >
          <option value="">All Cuisines</option>
          {CUISINE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Difficulty
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIFFICULTY_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => update({ difficulty: filters.difficulty === value ? '' : value })}
              className={filters.difficulty === value ? active : inactive}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Dietary
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIET_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleDietary(value)}
              className={(filters.dietary ?? []).includes(value) ? active : inactive}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Max Time */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Max Time (min)
        </label>
        <input
          type="number"
          min={1}
          value={filters.maxTime ?? ''}
          onChange={e => update({ maxTime: e.target.value })}
          placeholder="e.g. 30"
          className="w-full px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors"
        />
      </div>

      {/* Min Rating */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Min Rating
        </label>
        <div className="flex gap-2 flex-wrap">
          {[3, 4, 4.5].map(r => (
            <button
              key={r}
              onClick={() => update({ minRating: Number(filters.minRating) === r ? '' : r })}
              className={Number(filters.minRating) === r ? active : inactive}
            >
              {r}+ ★
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
