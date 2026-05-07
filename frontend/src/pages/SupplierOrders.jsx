import { useEffect, useState } from 'react';
import { Package, ChevronDown, ChevronUp, MapPin, StickyNote, XCircle, Truck } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import { getSupplierOrders, getOrder, cancelOrderLine, markOrderShipped } from '../api/orders';

export default function SupplierOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSupplierOrders()
      .then((d) => { if (!cancelled) setOrders(itemsOf(d)); })
      .catch(()  => { if (!cancelled) setOrders([]); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const handleCancel = async () => {
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      const r = await cancelOrderLine(id);
      toast.success(`Order #${id} cancelled · $${r.refunded} refunded`);
      setReloadKey((k) => k + 1);
    } catch {
      // interceptor toast handles the error UX
    }
  };

  const handleShip = async (id) => {
    try {
      await markOrderShipped(id);
      toast.success(`Order #${id} marked shipped`);
      setReloadKey((k) => k + 1);
    } catch {
      // interceptor toast handles the error UX
    }
  };

  if (orders === null) {
    return (
      <div className="min-h-screen bg-[#FAF6E8] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">Incoming Orders</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            Orders placed against your inventory
          </p>
        </header>

        {orders.length === 0 ? (
          <EmptyState icon="📦" message="No orders yet." />
        ) : (
          <ul className="space-y-3 mt-4">
            {orders.map((o) => (
              <OrderCard
                key={o.order_id}
                order={o}
                onCancel={() => setCancelTarget(o.order_id)}
                onShip={() => handleShip(o.order_id)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={cancelTarget != null}
        title="Cannot fulfill this order?"
        message="The cook will be refunded for your portion (subtotal + delivery fee), your wallet will be debited, and the stock you reserved will be returned to your inventory."
        confirmLabel="Confirm cancellation"
        danger
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

function OrderCard({ order: o, onCancel, onShip }) {
  const [open, setOpen] = useState(false);
  const total  = Number(o.supplier_total ?? 0);
  const placed = o.order_date ?? o.placed_at;
  const itemCount = o.item_count ?? (o.items?.length ?? 0);
  const cancelled = !!o.cancelled;
  const shipped   = !!o.shipped;

  return (
    <li className={
      'bg-white border rounded-2xl p-5 ' +
      (cancelled ? 'border-[#F5C0C0] bg-[#FEF7F7]' : 'border-[#EBEBEB]')
    }>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#1A1A1A] flex items-center gap-2 flex-wrap">
              Order #{o.order_id}
              {o.recipe_title && <span className="font-medium text-[#6B6B6B]">· {o.recipe_title}</span>}
              {cancelled && (
                <span className="px-2 py-0.5 bg-[#FEEBEE] text-[#B71C1C] text-[11px] font-semibold rounded-md">
                  Cancelled
                </span>
              )}
              {!cancelled && shipped && (
                <span className="px-2 py-0.5 bg-[#E3F2FD] text-[#0D47A1] text-[11px] font-semibold rounded-md">
                  Shipped
                </span>
              )}
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
          {!cancelled && !shipped && (
            <button
              type="button"
              onClick={onShip}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#1B3A2D] rounded-md hover:bg-[#142B22]"
            >
              <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />
              Mark Shipped
            </button>
          )}
          {!cancelled && !shipped && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#B71C1C] border border-[#F5C0C0] rounded-md hover:bg-[#FEEBEE]"
            >
              <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              Cannot fulfill
            </button>
          )}
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
    <div className="mt-4 pt-4 border-t border-[#EBEBEB] space-y-4">
      {data.delivery_address && (
        <div className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#1B3A2D] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#1A1A1A]">Deliver to</div>
              <div className="text-[13px] text-[#1A1A1A]">{data.delivery_address}</div>
            </div>
          </div>
          {data.delivery_notes && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[#EBEBEB]">
              <StickyNote className="w-4 h-4 text-[#A8893E] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="text-[12px] text-[#6B6B6B]">{data.delivery_notes}</div>
            </div>
          )}
        </div>
      )}

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

      {data.supplier_total != null && (
        <div className="flex items-center justify-between pt-3 border-t border-[#EBEBEB] text-[13px]">
          <span className="text-[#6B6B6B] font-semibold">Your total</span>
          <span className="font-bold text-[#1A1A1A]">${Number(data.supplier_total).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function itemsOf(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}
