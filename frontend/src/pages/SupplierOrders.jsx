import { useEffect, useState } from 'react';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { getSupplierOrders, updateOrderStatus, getOrder } from '../api/orders';

// Pending is the initial status on order placement and isn't a selectable
// transition — supplier moves Pending → Confirmed → Ready → Completed,
// or → Declined at any point before Completed.
const SUPPLIER_TRANSITIONS = ['Confirmed', 'Ready', 'Completed', 'Declined'];

const STATUS_PILL = {
  pending:   'bg-[#FFF7DC] text-[#8A6E00]',
  confirmed: 'bg-[#E3F2FD] text-[#0D47A1]',
  ready:     'bg-[#E3F2FD] text-[#0D47A1]',
  completed: 'bg-[#E8F1EC] text-[#1B5E20]',
  declined:  'bg-[#FEEBEE] text-[#B71C1C]',
};

export default function SupplierOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    getSupplierOrders()
      .then((d) => { if (!cancelled) setOrders(itemsOf(d)); })
      .catch(()  => { if (!cancelled) setOrders([]); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const handleStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order #${orderId} → ${status}`);
      reload();
    } catch {
      // already toasted by the interceptor
    }
  };

  if (orders === null) {
    return (
      <div className="min-h-screen bg-[#FAF6E8] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => (o.status || '').toLowerCase() === filter);

  const counts = ['Pending', ...SUPPLIER_TRANSITIONS].reduce((acc, s) => {
    acc[s.toLowerCase()] = orders.filter((o) => (o.status || '').toLowerCase() === s.toLowerCase()).length;
    return acc;
  }, { all: orders.length });

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">Incoming Orders</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            Update status as you fulfill and ship items
          </p>
        </header>

        <FilterBar value={filter} onChange={setFilter} counts={counts} />

        {filtered.length === 0 ? (
          <EmptyState
            icon="📦"
            message={filter === 'all' ? 'No orders yet.' : `No orders with status "${filter}".`}
          />
        ) : (
          <ul className="space-y-3 mt-4">
            {filtered.map((o) => (
              <OrderCard key={o.order_id} order={o} onStatusChange={handleStatus} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterBar({ value, onChange, counts }) {
  const tabs = [
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'ready',     label: 'Ready' },
    { id: 'completed', label: 'Completed' },
    { id: 'declined',  label: 'Declined' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ' +
              (active
                ? 'bg-[#1B3A2D] text-white border border-[#1B3A2D]'
                : 'bg-white text-[#1A1A1A] border border-[#D0D0D0] hover:border-[#1B3A2D]')
            }
          >
            {t.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-[#F5F5F5] text-[#6B6B6B]'}`}>
              {counts[t.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OrderCard({ order: o, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const status = (o.status || 'pending').toLowerCase();
  const total  = Number(o.total_price ?? o.total ?? 0);
  const placed = o.order_date ?? o.placed_at;
  const itemCount = o.item_count ?? (o.items?.length ?? 0);

  return (
    <li className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#1A1A1A]">
              Order #{o.order_id}
              {o.recipe_title && <span className="font-medium text-[#6B6B6B]"> · {o.recipe_title}</span>}
            </div>
            <div className="text-[12px] text-[#6B6B6B] mt-0.5">
              {placed ? new Date(placed).toLocaleString() : '—'}
              {o.customer_name ? ` · ${o.customer_name}` : ''}
            </div>
            <div className="text-[12px] text-[#6B6B6B] mt-0.5">
              {itemCount} item{itemCount === 1 ? '' : 's'} · ${total.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${STATUS_PILL[status] || 'bg-[#F5F5F5] text-[#6B6B6B]'}`}>
            {capitalize(status)}
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              const next = e.target.value;
              if (next) onStatusChange(o.order_id, next);
              e.target.value = '';
            }}
            className="text-[13px] border border-[#D0D0D0] rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-[#1B3A2D]"
          >
            <option value="">Move to…</option>
            {SUPPLIER_TRANSITIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#6B6B6B] hover:bg-[#F5F5F5]"
            aria-label={open ? 'Hide details' : 'Show details'}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && <OrderDetails orderId={o.order_id} />}
    </li>
  );
}

function OrderDetails({ orderId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getOrder(orderId)
      .then((d) => { if (!cancelled) setData(d ?? {}); })
      .catch(()  => { if (!cancelled) setData({}); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (data === null) {
    return <div className="mt-4 pt-4 border-t border-[#EBEBEB]"><LoadingSpinner size="sm" /></div>;
  }

  const items = data.items ?? [];

  return (
    <div className="mt-4 pt-4 border-t border-[#EBEBEB]">
      {items.length === 0 ? (
        <p className="text-[13px] text-[#9E9E9E]">No items in this order.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between text-[13px]">
              <span className="text-[#1A1A1A]">
                {it.purchased_quantity ?? it.quantity}
                {it.unit ? ` ${it.unit}` : ''} · {it.ingredient_name ?? it.name ?? '—'}
              </span>
              <span className="text-[#6B6B6B]">${Number(it.subtotal ?? it.unit_price ?? 0).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function itemsOf(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
