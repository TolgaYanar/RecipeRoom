import { useEffect, useState } from 'react';
import { X, Package, MapPin, Check, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { planSubstitutions } from '../api/substitutions';

// Modal that runs the buyer-side substitution planner before items hit
// the cart. For each recipe ingredient the planner returns a preferred
// supplier item plus alternatives; the buyer picks per row and we hand
// the final selection back to the parent so it can build the cart entry.
export default function SubstitutionPicker({ recipe, onClose, onConfirm }) {
  const [plan, setPlan]     = useState(null);   // null = loading
  const [error, setError]   = useState(false);
  // ingredient_id -> alternative's ingredient_id (absent means use the preferred option)
  const [picks, setPicks]   = useState({});
  const [openRow, setOpenRow] = useState(null); // which row's alternatives panel is expanded

  useEffect(() => {
    let cancelled = false;
    // ask the planner for base-quantity prices (no servings) — the cart
    // and checkout do the servings scaling at render time
    planSubstitutions({
      recipe_id: recipe.recipe_id ?? recipe.id,
      ingredients: (recipe.ingredients ?? []).map((ing) => ({
        ingredient_id: ing.id ?? ing.ingredient_id ?? null,
        name:          ing.name,
        quantity:      Number(ing.quantity) || 0,
        unit:          ing.unit ?? null,
      })),
    })
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data?.ingredients) ? data.ingredients
                  : Array.isArray(data) ? data
                  : [];
        setPlan(arr);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [recipe]);

  const optionFor = (row) => {
    const id = picks[row.ingredient_id];
    if (id == null) return row.preferred_supplier_item ?? null;
    const all = [row.preferred_supplier_item, ...(row.alternatives ?? [])].filter(Boolean);
    return all.find((o) => (o.ingredient_id ?? o.id) === id) ?? row.preferred_supplier_item ?? null;
  };

  const pick = (rowIngId, optId) => {
    setPicks((prev) => ({ ...prev, [rowIngId]: optId }));
    setOpenRow(null);
  };

  const subtotal = (plan ?? []).reduce(
    (sum, row) => sum + Number(optionFor(row)?.price ?? 0),
    0
  );

  const confirm = () => {
    const items = (plan ?? []).map((row) => {
      const picked = optionFor(row);
      const pickedId = picked?.ingredient_id ?? picked?.id ?? null;
      // a substitution happened if the picked ingredient has a different
      // id than the recipe's original ingredient
      const isSub = pickedId != null && row.ingredient_id != null && pickedId !== row.ingredient_id;
      return {
        ingredient_id:    pickedId,
        name:             picked?.name ?? row.name,
        quantity:         Number(row.quantity) || 0,
        unit:             row.unit ?? null,
        price:            Number(picked?.price) || 0,
        supplier:         picked?.supplier ?? null,
        substituted_from: isSub ? { name: row.name } : null,
      };
    });
    onConfirm(items);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[640px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-5 border-b border-[#EBEBEB]">
          <div>
            <h2 className="text-[18px] font-bold text-[#1A1A1A]">Shop This Meal</h2>
            <p className="text-[13px] text-[#6B6B6B] mt-0.5">
              Pick suppliers and substitutes for {recipe.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5">
          {plan === null && !error && <LoadingSpinner size="md" />}

          {error && (
            <div className="bg-[#FEEBEE] border border-[#F5C0C0] rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#B71C1C] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="text-[13px] text-[#1A1A1A]">
                Couldn't load supplier inventory. You can still add the recipe — pricing
                will be filled in once suppliers are reachable.
              </div>
            </div>
          )}

          {plan && plan.length > 0 && (
            <ul className="space-y-3">
              {plan.map((row) => (
                <PlanRow
                  key={row.ingredient_id ?? row.name}
                  row={row}
                  selected={optionFor(row)}
                  open={openRow === row.ingredient_id}
                  onToggle={() => setOpenRow((cur) => cur === row.ingredient_id ? null : row.ingredient_id)}
                  onPick={(opt) => pick(row.ingredient_id, opt.ingredient_id ?? opt.id)}
                />
              ))}
            </ul>
          )}

          {plan && plan.length === 0 && !error && (
            <div className="text-[13px] text-[#6B6B6B] text-center py-6">
              No supplier-backed ingredients for this recipe yet.
            </div>
          )}
        </div>

        <footer className="p-5 border-t border-[#EBEBEB]">
          {subtotal > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] text-[#6B6B6B]">Items subtotal</span>
              <span className="text-[18px] font-bold text-[#1A1A1A]">${subtotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-[#D0D0D0] rounded-lg text-[14px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={plan === null}
              className="flex-1 py-2.5 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PlanRow({ row, selected, open, onToggle, onPick }) {
  const allOptions = [row.preferred_supplier_item, ...(row.alternatives ?? [])].filter(Boolean);
  const selectedId = selected?.ingredient_id ?? selected?.id ?? null;
  const isSubbed   = selectedId != null && row.ingredient_id != null && selectedId !== row.ingredient_id;

  return (
    <li className="border border-[#EBEBEB] rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">
              {formatLine(row.quantity, row.unit, row.name)}
            </div>
            {isSubbed && (
              <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-[#FFF7DC] text-[#8A6E00] text-[11px] font-semibold rounded-md">
                Substituted
              </span>
            )}
          </div>
          {allOptions.length > 1 && (
            <button
              type="button"
              onClick={onToggle}
              className="text-[12px] font-semibold text-[#1B3A2D] hover:underline shrink-0"
            >
              {open ? 'Hide options' : `Change (${allOptions.length})`}
            </button>
          )}
        </div>

        {selected ? (
          <SelectedOption option={selected} />
        ) : (
          <div className="text-[12px] text-[#9E9E9E]">No supplier available.</div>
        )}
      </div>

      {open && allOptions.length > 1 && (
        <ul className="bg-[#FAFAFA] border-t border-[#EBEBEB] divide-y divide-[#EBEBEB]">
          {allOptions.map((opt) => {
            const id = opt.ingredient_id ?? opt.id;
            const active = id === selectedId;
            return (
              <li key={id ?? opt.name}>
                <button
                  type="button"
                  onClick={() => onPick(opt)}
                  className={
                    'w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors ' +
                    (active ? 'bg-[#F5F8F6]' : 'hover:bg-white')
                  }
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={
                        'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ' +
                        (active ? 'border-[#1B3A2D]' : 'border-[#D0D0D0]')
                      }
                    >
                      {active && <Check className="w-2.5 h-2.5 text-[#1B3A2D]" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#1A1A1A]">{opt.name}</div>
                      <SupplierLine supplier={opt.supplier} inStock={opt.in_stock} />
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold text-[#1A1A1A] shrink-0">
                    ${Number(opt.price ?? 0).toFixed(2)}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function SelectedOption({ option: o }) {
  return (
    <div className="bg-[#F5F8F6] border border-[#D0D0D0] rounded-lg p-2.5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <Package className="w-4 h-4 text-[#1B3A2D] mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">{o.name}</div>
          <SupplierLine supplier={o.supplier} inStock={o.in_stock} />
        </div>
      </div>
      <div className="text-[14px] font-bold text-[#1A1A1A] shrink-0">
        ${Number(o.price ?? 0).toFixed(2)}
      </div>
    </div>
  );
}

function SupplierLine({ supplier, inStock }) {
  if (!supplier) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mt-0.5">
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3 h-3" strokeWidth={1.5} />
        {supplier.name}{supplier.distance_miles != null ? ` · ${supplier.distance_miles} mi` : ''}
      </span>
      {inStock === false && (
        <span className="text-[#B71C1C] font-semibold">Out of stock</span>
      )}
    </div>
  );
}

function formatLine(qty, unit, name) {
  const q = Number(qty);
  if (!q) return name;
  const qtyStr = Number.isInteger(q) ? `${q}` : q.toFixed(2).replace(/\.?0+$/, '');
  return `${qtyStr}${unit ? unit + ' ' : ' '}${name}`;
}
