import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import useIngredientSearch from '../hooks/useIngredientSearch';

const UNITS = ['', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'slice', 'pinch', 'bunch'];

export default function IngredientRow({ ingredient, index, onChange, onRemove }) {
  const update = (patch) => onChange(index, { ...ingredient, ...patch });

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const term = (ingredient.name || '').trim();
  const { results, loading } = useIngredientSearch(term);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (r) => {
    update({ id: r.ingredient_id ?? r.id ?? null, name: r.name });
    setOpen(false);
  };

  return (
    <div className="flex items-start gap-2">
      <input
        type="text"
        value={ingredient.quantity ?? ''}
        onChange={(e) => update({ quantity: e.target.value })}
        placeholder="Qty"
        className="w-[80px] shrink-0 px-2.5 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors text-center"
      />
      <select
        value={ingredient.unit ?? ''}
        onChange={(e) => update({ unit: e.target.value })}
        className="w-[90px] shrink-0 px-2 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D] transition-colors bg-white"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>{u || '—'}</option>
        ))}
      </select>

      <div className="relative flex-1" ref={wrapperRef}>
        <input
          type="text"
          value={ingredient.name ?? ''}
          onChange={(e) => { update({ id: null, name: e.target.value }); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Ingredient name"
          className="w-full px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors"
        />
        {open && term && (loading || results.length > 0) && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-[#EBEBEB] rounded-lg shadow-md max-h-[200px] overflow-auto">
            {loading ? (
              <li className="px-3 py-2 text-[12px] text-[#6B6B6B]">Searching…</li>
            ) : (
              results.map((r) => (
                <li key={r.ingredient_id ?? r.id ?? r.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                    className="w-full text-left px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#FAF8F5]"
                  >
                    {r.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 w-8 h-8 mt-1 flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#B71C1C] hover:bg-[#FFEBEE] transition-all"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
