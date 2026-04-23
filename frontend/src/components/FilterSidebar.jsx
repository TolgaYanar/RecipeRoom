import { useSearchParams } from 'react-router-dom';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Low-Carb', 'Nut-Free'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const CUISINE_OPTIONS = ['', 'American', 'Asian', 'Italian', 'Korean', 'Mediterranean', 'Middle Eastern', 'Spanish', 'Turkish'];

export default function FilterSidebar({ filters, onChange }) {
  const [, setSearchParams] = useSearchParams();

  const update = (patch) => {
    const next = { ...filters, ...patch };
    onChange(next);
    // Sync to URL
    const params = new URLSearchParams();
    if (next.cuisine) params.set('cuisine', next.cuisine);
    if (next.difficulty) params.set('difficulty', next.difficulty);
    if (next.dietary?.length) params.set('dietary', next.dietary.join(','));
    if (next.maxTime) params.set('maxTime', next.maxTime);
    if (next.minRating) params.set('minRating', next.minRating);
    setSearchParams(params, { replace: true });
  };

  const toggleDietary = (tag) => {
    const current = filters.dietary ?? [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    update({ dietary: next });
  };

  const hasActive =
    filters.cuisine || filters.difficulty || filters.dietary?.length ||
    filters.maxTime || filters.minRating;

  return (
    <aside className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-xl p-5 space-y-6">
      {/* Header */}
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
          onChange={(e) => update({ cuisine: e.target.value })}
          className="w-full px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg bg-white focus:outline-none focus:border-[#1B3A2D] transition-colors"
        >
          <option value="">All Cuisines</option>
          {CUISINE_OPTIONS.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Difficulty
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIFFICULTY_OPTIONS.map((d) => {
            const active = filters.difficulty === d;
            return (
              <button
                key={d}
                onClick={() => update({ difficulty: active ? '' : d })}
                className="px-4 py-1.5 rounded-[100px] text-[13px] font-medium border transition-all"
                style={active
                  ? { backgroundColor: '#1B3A2D', borderColor: '#1B3A2D', color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#D0D0D0', color: '#1A1A1A' }
                }
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dietary */}
      <div>
        <label className="block text-[13px] font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
          Dietary
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIETARY_OPTIONS.map((tag) => {
            const active = (filters.dietary ?? []).includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleDietary(tag)}
                className="px-3 py-1.5 rounded-[100px] text-[13px] font-medium border transition-all"
                style={active
                  ? { backgroundColor: '#1B3A2D', borderColor: '#1B3A2D', color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#D0D0D0', color: '#1A1A1A' }
                }
              >
                {tag}
              </button>
            );
          })}
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
          onChange={(e) => update({ maxTime: e.target.value })}
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
          {[3, 4, 4.5].map((r) => {
            const active = Number(filters.minRating) === r;
            return (
              <button
                key={r}
                onClick={() => update({ minRating: active ? '' : r })}
                className="px-3 py-1.5 rounded-[100px] text-[13px] font-medium border transition-all"
                style={active
                  ? { backgroundColor: '#1B3A2D', borderColor: '#1B3A2D', color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#D0D0D0', color: '#1A1A1A' }
                }
              >
                {r}+ ★
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
