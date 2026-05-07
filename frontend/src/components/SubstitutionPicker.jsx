import { useEffect, useState } from 'react';
import { X, Package, MapPin, Check, AlertCircle, Info } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { planSubstitutions } from '../api/substitutions';
import { DELIVERY_FEE_PER_SUPPLIER, MIN_SUPPLIER_SUBTOTAL } from '../lib/cart';

// Modal that runs the buyer-side substitution planner before items hit
// the cart. For each recipe ingredient the planner returns a preferred
// supplier item plus alternatives (other suppliers + substitute
// ingredients); the buyer picks per row and we hand the final selection
// back to the parent so it can build the cart entry.
export default function SubstitutionPicker({ recipe, servings, baseServings, onClose, onConfirm }) {
  const [plan, setPlan]     = useState(null);
  const [error, setError]   = useState(false);
  // row ingredient_id -> selected option_id (composite "ingredientId:supplierId")
  const [picks, setPicks]   = useState({});
  const [openRow, setOpenRow] = useState(null);

  const ratio = (Number(servings) || Number(baseServings) || 1) / (Number(baseServings) || 1);

  useEffect(() => {
    let cancelled = false;
    planSubstitutions({
      recipe_id: recipe.recipe_id ?? recipe.id,
      ingredients: (recipe.ingredients ?? []).map((ing) => {
        const baseQty = Number(ing.quantity) || 0;
        return {
          ingredient_id:      ing.id ?? ing.ingredient_id ?? null,
          name:               ing.name,
          quantity:           baseQty,
          requested_quantity: baseQty * ratio,
          unit:               ing.unit ?? null,
        };
      }),
    })
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data?.ingredients) ? data.ingredients
                  : Array.isArray(data) ? data
                  : [];
        setPlan(arr.map((row) => normalizeRow(row, ratio)));
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [recipe, ratio]);

  const optionFor = (row) => {
    const id = picks[row.ingredient_id];
    if (id == null) return row.preferred_supplier_item ?? null;
    const all = [row.preferred_supplier_item, ...(row.alternatives ?? [])].filter(Boolean);
    return all.find((o) => o.option_id === id) ?? row.preferred_supplier_item ?? null;
  };

  const pick = (rowIngId, optKey) => {
    setPicks((prev) => ({ ...prev, [rowIngId]: optKey }));
    setOpenRow(null);
  };

  const subtotal = (plan ?? []).reduce(
    (sum, row) => sum + Number(optionFor(row)?.price ?? 0) * ratio,
    0
  );

  const blocked = (plan ?? []).some((row) => {
    const o = optionFor(row);
    return !o || o.has_enough === false;
  });

  // Group selected options by supplier so we can flag tiny per-supplier
  // subtotals that incur the full delivery fee for almost no goods.
  const supplierGroups = new Map();
  for (const row of (plan ?? [])) {
    const o = optionFor(row);
    if (!o?.supplier?.id) continue;
    const sid = o.supplier.id;
    if (!supplierGroups.has(sid)) {
      supplierGroups.set(sid, { name: o.supplier.name, subtotal: 0 });
    }
    supplierGroups.get(sid).subtotal += Number(o.price || 0) * ratio;
  }
  const tinySuppliers = [...supplierGroups.values()].filter(
    (g) => g.subtotal > 0 && g.subtotal < MIN_SUPPLIER_SUBTOTAL
  );
  const supplierCount = supplierGroups.size;
  const deliveryFee = supplierCount * DELIVERY_FEE_PER_SUPPLIER;

  const confirm = () => {
    if (blocked) return;
    const items = (plan ?? []).map((row) => {
      const picked = optionFor(row);
      const pickedId = picked?.ingredient_id ?? null;
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
                  ratio={ratio}
                  open={openRow === row.ingredient_id}
                  onToggle={() => setOpenRow((cur) => cur === row.ingredient_id ? null : row.ingredient_id)}
                  onPick={(opt) => pick(row.ingredient_id, opt.option_id)}
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
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#6B6B6B]">Items subtotal</span>
                <span className="text-[14px] font-semibold text-[#1A1A1A]">${subtotal.toFixed(2)}</span>
              </div>
              {supplierCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#9E9E9E]">
                    Delivery · {supplierCount} supplier{supplierCount === 1 ? '' : 's'} × ${DELIVERY_FEE_PER_SUPPLIER.toFixed(2)}
                  </span>
                  <span className="text-[12px] text-[#6B6B6B]">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[14px] text-[#1A1A1A] font-bold">Total</span>
                <span className="text-[18px] font-bold text-[#1A1A1A]">${(subtotal + deliveryFee).toFixed(2)}</span>
              </div>
            </div>
          )}
          {tinySuppliers.length > 0 && !blocked && (
            <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-[#FFF7DC] border border-[#F0E2A8] rounded-lg">
              <Info className="w-4 h-4 text-[#A8893E] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-[12px] text-[#1A1A1A]">
                {tinySuppliers.map((s) => `${s.name} ($${s.subtotal.toFixed(2)})`).join(', ')}{' '}
                {tinySuppliers.length === 1 ? 'has' : 'have'} a small subtotal — you'll still pay ${DELIVERY_FEE_PER_SUPPLIER.toFixed(2)} delivery for {tinySuppliers.length === 1 ? 'it' : 'each'}.
              </span>
            </div>
          )}
          {blocked && plan && (
            <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-[#FEEBEE] border border-[#F5C0C0] rounded-lg">
              <AlertCircle className="w-4 h-4 text-[#B71C1C] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-[12px] text-[#1A1A1A]">
                Some items don't have enough stock. Pick an alternative or reduce servings.
              </span>
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
              disabled={plan === null || blocked}
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

function PlanRow({ row, selected, ratio, open, onToggle, onPick }) {
  const allOptions = [row.preferred_supplier_item, ...(row.alternatives ?? [])].filter(Boolean);
  const selectedKey = selected?.option_id ?? null;
  const isSubbed   = selected?.ingredient_id != null && row.ingredient_id != null && selected.ingredient_id !== row.ingredient_id;
  const insufficient = selected && selected.has_enough === false;

  return (
    <li className={
      'border rounded-xl overflow-hidden ' +
      (insufficient ? 'border-[#F5C0C0] bg-[#FEF7F7]' : 'border-[#EBEBEB]')
    }>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">
              {formatLine(row.requested_quantity ?? row.quantity, row.unit, row.name)}
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
          <SelectedOption option={selected} ratio={ratio} unit={row.unit} />
        ) : (
          <div className="text-[12px] text-[#9E9E9E]">No supplier available.</div>
        )}

        {insufficient && (
          <div className="mt-2 flex items-start gap-2 px-2.5 py-1.5 bg-white border border-[#F5C0C0] rounded-md">
            <AlertCircle className="w-3.5 h-3.5 text-[#B71C1C] shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className="text-[11px] text-[#1A1A1A]">
              Insufficient stock — needs {formatQty(row.requested_quantity ?? row.quantity)}{row.unit ?? ''}, only {formatQty(selected.current_stock)}{selected.unit ?? row.unit ?? ''} available.
            </span>
          </div>
        )}
      </div>

      {open && allOptions.length > 1 && (
        <ul className="bg-[#FAFAFA] border-t border-[#EBEBEB] divide-y divide-[#EBEBEB]">
          {allOptions.map((opt) => {
            const active = opt.option_id === selectedKey;
            return (
              <li key={opt.option_id ?? opt.name}>
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
                      <SupplierLine
                        supplier={opt.supplier}
                        currentStock={opt.current_stock}
                        unit={opt.unit ?? row.unit}
                        hasEnough={opt.has_enough}
                      />
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold text-[#1A1A1A] shrink-0">
                    ${(Number(opt.price ?? 0) * ratio).toFixed(2)}
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

function SelectedOption({ option: o, ratio, unit }) {
  return (
    <div className="bg-[#F5F8F6] border border-[#D0D0D0] rounded-lg p-2.5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <Package className="w-4 h-4 text-[#1B3A2D] mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">{o.name}</div>
          <SupplierLine
            supplier={o.supplier}
            currentStock={o.current_stock}
            unit={o.unit ?? unit}
            hasEnough={o.has_enough}
          />
        </div>
      </div>
      <div className="text-[14px] font-bold text-[#1A1A1A] shrink-0">
        ${(Number(o.price ?? 0) * ratio).toFixed(2)}
      </div>
    </div>
  );
}

function SupplierLine({ supplier, currentStock, unit, hasEnough }) {
  if (!supplier) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mt-0.5 flex-wrap">
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3 h-3" strokeWidth={1.5} />
        {supplier.name}{supplier.distance_miles != null ? ` · ${supplier.distance_miles} mi` : ''}
      </span>
      {currentStock != null && (
        <span className={hasEnough === false ? 'text-[#B71C1C] font-semibold' : 'text-[#6B6B6B]'}>
          {formatQty(currentStock)}{unit ?? ''} in stock
        </span>
      )}
    </div>
  );
}

function formatLine(qty, unit, name) {
  const q = Number(qty);
  if (!q) return name;
  return `${formatQty(q)}${unit ? unit + ' ' : ' '}${name}`;
}

function formatQty(n) {
  const q = Number(n);
  if (!Number.isFinite(q)) return '';
  return Number.isInteger(q) ? `${q}` : q.toFixed(2).replace(/\.?0+$/, '');
}

// Adapt the planner's response into the picker's flatter option shape.
// `option.price` stays at the base-quantity unit total so the cart can
// keep scaling by `servings/base_servings` at render time. The picker
// displays the scaled price separately via `ratio` for accuracy.
function normalizeRow(row, ratio) {
  const baseQty = Number(row.base_quantity ?? row.quantity) || 0;
  const reqQty  = Number(row.requested_quantity ?? baseQty * ratio);
  return {
    ingredient_id:      row.ingredient_id,
    name:               row.ingredient_name ?? row.name,
    quantity:           baseQty,
    requested_quantity: reqQty,
    unit:               row.unit,
    preferred_supplier_item: toOption(row.preferred_supplier ?? row.preferred_supplier_item, row, baseQty, reqQty),
    alternatives:  (row.alternatives ?? []).map((alt) => toOption(alt, row, baseQty, reqQty)).filter(Boolean),
  };
}

function toOption(s, row, baseQty, reqQty) {
  if (!s) return null;
  const unitPrice = Number(s.price_per_unit ?? s.price) || 0;
  const mult      = Number(s.quantity_multiplier ?? 1);
  const ingId     = s.ingredient_id ?? row.ingredient_id;
  const supId     = s.supplier_id ?? s.supplier?.id ?? null;
  return {
    option_id:     `${ingId}:${supId}`,
    ingredient_id: ingId,
    name:          s.ingredient_name ?? s.name ?? row.ingredient_name ?? row.name,
    price:         unitPrice * baseQty * mult,
    current_stock: s.current_stock,
    unit:          s.unit ?? row.unit,
    has_enough:    s.has_enough != null
                     ? !!s.has_enough
                     : (Number(s.current_stock) >= reqQty * mult),
    supplier: {
      id:   supId,
      name: s.supplier_name ?? s.supplier?.name ?? '',
      distance_miles: s.distance_miles ?? s.supplier?.distance_miles ?? null,
    },
  };
}
