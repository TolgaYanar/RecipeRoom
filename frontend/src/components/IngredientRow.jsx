import { X } from 'lucide-react';

const UNITS = ['', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'slice', 'pinch', 'bunch'];

export default function IngredientRow({ ingredient, index, onChange, onRemove }) {
  const update = (field, value) => onChange(index, { ...ingredient, [field]: value });

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={ingredient.quantity ?? ''}
        onChange={(e) => update('quantity', e.target.value)}
        placeholder="Qty"
        className="w-[80px] shrink-0 px-2.5 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors text-center"
      />
      <select
        value={ingredient.unit ?? ''}
        onChange={(e) => update('unit', e.target.value)}
        className="w-[90px] shrink-0 px-2 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D] transition-colors bg-white"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>{u || '—'}</option>
        ))}
      </select>
      <input
        type="text"
        value={ingredient.name ?? ''}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Ingredient name"
        className="flex-1 px-3 py-2 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#B71C1C] hover:bg-[#FFEBEE] transition-all"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
