import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertCircle, DollarSign, ShoppingBag, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getSupplierInventory } from '../api/suppliers';
import { getSupplierOrders } from '../api/orders';

const LOW_STOCK = 50;

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [inv, setInv] = useState(null);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (!user?.user_id) return;
    let cancelled = false;
    Promise.all([
      getSupplierInventory(user.user_id).catch(() => ({ inventory: [], kpis: {} })),
      getSupplierOrders().catch(() => []),
    ]).then(([i, o]) => {
      if (cancelled) return;
      setInv(i);
      setOrders(Array.isArray(o) ? o : (o?.items ?? []));
    });
    return () => { cancelled = true; };
  }, [user?.user_id]);

  if (inv === null || orders === null) {
    return (
      <div className="min-h-screen bg-[#FAF6E8] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const inventory = inv.inventory ?? [];
  const lowStock  = inventory.filter((it) => Number(it.current_stock ?? 0) < LOW_STOCK);

  const openOrders = orders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'pending' || s === 'fulfilled';
  });

  // revenue this month — non-cancelled order totals dated in the current month
  const now = new Date();
  const monthRevenue = orders.reduce((sum, o) => {
    if ((o.status || '').toLowerCase() === 'cancelled') return sum;
    const d = new Date(o.order_date ?? 0);
    const sameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return sameMonth ? sum + Number(o.total_price ?? 0) : sum;
  }, 0);

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">
            {inv.supplier?.business_name ?? 'Supplier Dashboard'}
          </h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            Stock levels, incoming orders, and monthly revenue at a glance
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Kpi
            icon={<ShoppingBag className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}
            label="Open Orders"
            value={openOrders.length}
            href="/supplier/orders"
          />
          <Kpi
            icon={<AlertCircle className="w-5 h-5 text-[#B71C1C]" strokeWidth={1.5} />}
            label="Low Stock Items"
            value={lowStock.length}
            href="/supplier/inventory"
            warn={lowStock.length > 0}
          />
          <Kpi
            icon={<Package className="w-5 h-5 text-[#A8893E]" strokeWidth={1.5} />}
            label="Total Products"
            value={inventory.length}
            href="/supplier/inventory"
          />
          <Kpi
            icon={<DollarSign className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}
            label="Revenue This Month"
            value={`$${monthRevenue.toFixed(2)}`}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <RecentOrdersCard orders={orders.slice(0, 5)} />
          <LowStockCard items={lowStock} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, href, warn }) {
  const inner = (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 hover:border-[#1B3A2D] transition-colors h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[12px] text-[#6B6B6B]">{label}</span>
      </div>
      <div className={`text-[26px] font-bold ${warn ? 'text-[#B71C1C]' : 'text-[#1A1A1A]'} leading-tight`}>
        {value}
      </div>
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

function RecentOrdersCard({ orders }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-bold text-[#1A1A1A]">Recent Orders</h2>
        <Link
          to="/supplier/orders"
          className="inline-flex items-center gap-1 text-[12px] text-[#1B3A2D] font-semibold hover:underline"
        >
          See all <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>
      </header>

      {orders.length === 0 ? (
        <p className="text-[13px] text-[#9E9E9E] py-4 text-center">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {orders.map((o) => (
            <li key={o.order_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                  Order #{o.order_id}
                  {o.recipe_title && <span className="text-[#6B6B6B] font-normal"> · {o.recipe_title}</span>}
                </div>
                <div className="text-[11px] text-[#6B6B6B]">
                  {o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="text-[13px] font-semibold text-[#1A1A1A] shrink-0">
                ${Number(o.total_price ?? 0).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LowStockCard({ items }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-bold text-[#1A1A1A]">Low Stock Alerts</h2>
        <Link
          to="/supplier/inventory"
          className="inline-flex items-center gap-1 text-[12px] text-[#1B3A2D] font-semibold hover:underline"
        >
          Manage <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="text-[13px] text-[#9E9E9E] py-4 text-center">All items are well-stocked.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {items.map((it) => (
            <li key={it.ingredient_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">{it.ingredient_name}</div>
                <div className="text-[11px] text-[#6B6B6B]">{it.generic_taxonomy_name}</div>
              </div>
              <div className="text-[13px] font-semibold text-[#B71C1C] shrink-0">
                {it.current_stock} {it.unit ?? ''} left
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
