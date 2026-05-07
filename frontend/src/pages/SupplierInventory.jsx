import { useEffect, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSupplierInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem,
} from '../api/suppliers';
import { searchIngredients } from '../api/ingredients';

// Unit-aware low-stock thresholds — mirrors the SQL view so the live
// badge while editing matches what the backend will say after save.
const LOW_STOCK_BY_UNIT = {
  g: 100, kg: 0.1, mg: 100000,
  ml: 100, l: 0.1,
  piece: 5, pieces: 5, pcs: 5, unit: 5, units: 5,
};
const LOW_STOCK_DEFAULT = 30;

function lowStockThreshold(unit) {
  const u = String(unit ?? '').trim().toLowerCase();
  return LOW_STOCK_BY_UNIT[u] ?? LOW_STOCK_DEFAULT;
}

export default function SupplierInventory() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.user_id) return;
    let cancelled = false;
    getSupplierInventory(user.user_id)
      .then((d) => { if (!cancelled) setData(d ?? { inventory: [], kpis: {} }); })
      .catch(()  => { if (!cancelled) setData({ inventory: [], kpis: {} }); });
    return () => { cancelled = true; };
  }, [user?.user_id, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const handleSaveRow = async (ingredientId, patch) => {
    try {
      await updateInventoryItem(ingredientId, patch);
      toast.success('Item updated');
      reload();
    } catch {
      // already toasted by the interceptor
    }
  };

  const handleDelete = async () => {
    if (confirmDelete == null) return;
    try {
      await deleteInventoryItem(confirmDelete);
      toast.success('Item removed');
      setConfirmDelete(null);
      reload();
    } catch {
      // already toasted by the interceptor
      setConfirmDelete(null);
    }
  };

  if (data === null) {
    return (
      <div className="min-h-screen bg-[#FAF6E8] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const items = (data.inventory ?? []).filter((it) => {
    if (!search.trim()) return true;
    return (it.ingredient_name ?? it.name ?? '').toLowerCase().includes(search.toLowerCase());
  });
  const kpis = data.kpis ?? {};

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">Inventory</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            Manage your stock, pricing, and product range
          </p>
        </header>

        <KpiRow kpis={kpis} totalShown={items.length} />

        <div className="flex items-center justify-between flex-wrap gap-3 mt-6 mb-4">
          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg bg-white focus:outline-none focus:border-[#1B3A2D]"
            />
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Item
          </button>
        </div>

        {adding && (
          <AddItemForm
            onCancel={() => setAdding(false)}
            onAdded={() => { setAdding(false); reload(); }}
          />
        )}

        {items.length === 0 ? (
          <EmptyState
            icon="📦"
            message={search ? 'No items match your search.' : "You haven't added any items yet."}
          />
        ) : (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#FAF8F5] border-b border-[#EBEBEB]">
                <tr className="text-left text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
                  <th className="px-5 py-3">Ingredient</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Unit</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {items.map((it) => (
                  <InventoryRow
                    key={it.ingredient_id}
                    item={it}
                    onSave={handleSaveRow}
                    onDelete={() => setConfirmDelete(it.ingredient_id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete != null}
        title="Remove this item?"
        message="It will no longer appear in shopper search results until you re-add it."
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function KpiRow({ kpis, totalShown }) {
  const cards = [
    { label: 'Total Products',  value: kpis.total_products ?? totalShown ?? 0 },
    { label: 'In Stock',        value: kpis.in_stock_count    ?? '—' },
    { label: 'Low Stock',       value: kpis.low_stock_count   ?? '—', warn: (kpis.low_stock_count ?? 0) > 0 },
    { label: 'Out of Stock',    value: kpis.out_of_stock_count ?? '—' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-[#EBEBEB] rounded-2xl p-4">
          <div className="text-[12px] text-[#6B6B6B] mb-1">{c.label}</div>
          <div className={`text-[24px] font-bold ${c.warn ? 'text-[#B71C1C]' : 'text-[#1A1A1A]'}`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function InventoryRow({ item, onSave, onDelete }) {
  const [stock, setStock] = useState(item.current_stock ?? 0);
  const [price, setPrice] = useState(item.price_per_unit ?? 0);
  const dirty = Number(stock) !== Number(item.current_stock) || Number(price) !== Number(item.price_per_unit);

  const status = (() => {
    const s = Number(stock);
    if (s <= 0) return { label: 'Out of Stock', cls: 'bg-[#FEEBEE] text-[#B71C1C]' };
    if (s < lowStockThreshold(item.unit)) return { label: 'Low Stock', cls: 'bg-[#FFF7DC] text-[#8A6E00]' };
    return { label: 'In Stock', cls: 'bg-[#E8F1EC] text-[#1B5E20]' };
  })();

  return (
    <tr>
      <td className="px-5 py-4">
        <div className="text-[14px] font-semibold text-[#1A1A1A]">{item.ingredient_name ?? item.name ?? '—'}</div>
        {item.generic_taxonomy_name && (
          <div className="text-[12px] text-[#6B6B6B]">{item.generic_taxonomy_name}</div>
        )}
      </td>
      <td className="px-5 py-4">
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-24 px-2 py-1.5 text-[14px] border border-[#D0D0D0] rounded-md focus:outline-none focus:border-[#1B3A2D]"
        />
      </td>
      <td className="px-5 py-4 text-[13px] text-[#6B6B6B]">{item.unit ?? '—'}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <span className="text-[13px] text-[#6B6B6B]">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 px-2 py-1.5 text-[14px] border border-[#D0D0D0] rounded-md focus:outline-none focus:border-[#1B3A2D]"
          />
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => onSave(item.ingredient_id, {
              current_stock:  Number(stock),
              price_per_unit: Number(price),
            })}
            className="px-3 py-1.5 bg-[#1B3A2D] text-white rounded-md text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142B22]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#B71C1C] hover:bg-[#FFEBEE]"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddItemForm({ onCancel, onAdded }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('g');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term || picked) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      searchIngredients(term)
        .then((data) => {
          if (cancelled) return;
          const arr = Array.isArray(data) ? data : (data?.items ?? []);
          setResults(arr);
        })
        .catch(() => { if (!cancelled) setResults([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, picked]);

  const create = async () => {
    if (!picked || !stock || !price) {
      toast.error('Pick an ingredient and fill stock + price');
      return;
    }
    setSaving(true);
    try {
      await createInventoryItem({
        ingredient_id:  picked.ingredient_id ?? picked.id,
        current_stock:  Number(stock),
        price_per_unit: Number(price),
        unit:           unit.trim() || 'g',
      });
      toast.success('Item added');
      onAdded();
    } catch {
      // already toasted by the interceptor
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#1B3A2D] rounded-2xl p-5 mb-4">
      <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Add Inventory Item</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Ingredient</label>
          <input
            type="text"
            value={picked ? picked.name : query}
            onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
            placeholder="Search…"
            className="w-full px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
          />
          {!picked && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-[#EBEBEB] rounded-lg shadow-md max-h-[160px] overflow-auto">
              {results.map((r) => (
                <li key={r.ingredient_id ?? r.id ?? r.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setPicked(r); setQuery(''); setResults([]); }}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#FAF8F5]"
                  >
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Stock</label>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="g"
            className="w-full px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Price per unit</label>
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-[#6B6B6B]">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold disabled:opacity-60 hover:bg-[#142B22]"
        >
          {saving ? 'Saving…' : 'Add Item'}
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
