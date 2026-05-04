import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Truck, CreditCard, Check, AlertCircle, Package,
  MapPin, Wallet, ArrowRight,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import useCart from '../hooks/useCart';
import { cartSubtotal, cartTotal, DELIVERY_FEE, clearCart } from '../lib/cart';
import { createOrder } from '../api/orders';

const STEPS = [
  { id: 'review',   label: 'Review Cart', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery',    icon: Truck },
  { id: 'payment',  label: 'Payment',     icon: CreditCard },
];

export default function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const cart = useCart();

  const [step, setStep] = useState('review');
  const [address, setAddress] = useState('');
  const [notes,   setNotes]   = useState('');
  const [payment, setPayment] = useState('wallet');
  const [submitting, setSubmitting] = useState(false);

  if (cart.recipes.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF6E8]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] mb-8">Checkout</h1>
          <EmptyState
            icon="🛒"
            message="Nothing to check out yet."
            action={
              <Link
                to="/recipes"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] transition-colors"
              >
                Browse Recipes
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const goNext = () => {
    if (step === 'review')   setStep('delivery');
    else if (step === 'delivery') {
      if (!address.trim()) { toast.error('Delivery address is required'); return; }
      setStep('payment');
    }
  };

  const goBack = () => {
    if (step === 'payment')  setStep('delivery');
    else if (step === 'delivery') setStep('review');
  };

  const completeOrder = async () => {
    setSubmitting(true);
    try {
      // flat line items — each carries supplier_id so the backend can
      // group them into per-supplier Order rows on insert
      const items = cart.recipes.flatMap((r) => {
        const ratio = r.servings / (r.base_servings || r.servings || 1);
        return (r.ingredients || []).map((ing) => ({
          recipe_id:     r.recipe_id,
          ingredient_id: ing.ingredient_id ?? null,
          name:          ing.name,
          quantity:      Number(ing.quantity || 0) * ratio,
          unit:          ing.unit ?? null,
          unit_price:    Number(ing.price) || 0,
          supplier_id:   ing.supplier?.id ?? null,
        }));
      });

      await createOrder({
        delivery_address: address.trim(),
        delivery_notes:   notes.trim() || null,
        payment_method:   payment,
        items,
      });

      clearCart();
      toast.success('Order placed — see Profile › Orders');
      navigate('/profile');
    } catch {
      // already toasted by the interceptor
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] leading-tight">Checkout</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            Complete your order for {cart.recipes.length} recipe{cart.recipes.length === 1 ? '' : 's'}
          </p>
        </header>

        <Stepper current={step} />

        <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start mt-8">
          <div>
            {step === 'review'   && <ReviewStep cart={cart} />}
            {step === 'delivery' && (
              <DeliveryStep
                address={address}     onAddressChange={setAddress}
                notes={notes}         onNotesChange={setNotes}
              />
            )}
            {step === 'payment'  && <PaymentStep value={payment} onChange={setPayment} />}
          </div>

          <Sidebar
            cart={cart}
            step={step}
            submitting={submitting}
            onNext={goNext}
            onBack={goBack}
            onComplete={completeOrder}
          />
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center justify-center gap-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={
                  'w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ' +
                  (done   ? 'bg-[#1B3A2D] border-[#1B3A2D] text-white' :
                   active ? 'bg-[#1B3A2D] border-[#1B3A2D] text-white' :
                            'bg-white border-[#D0D0D0] text-[#9E9E9E]')
                }
              >
                {done ? <Check className="w-4 h-4" strokeWidth={2} /> : <Icon className="w-4 h-4" strokeWidth={1.5} />}
              </div>
              <span className={`text-[14px] font-semibold ${active || done ? 'text-[#1A1A1A]' : 'text-[#9E9E9E]'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-px mx-3 ${i < idx ? 'bg-[#1B3A2D]' : 'bg-[#D0D0D0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewStep({ cart }) {
  // collected substitutions ride at the top, then per-supplier groups
  const subs = cart.recipes.flatMap((r) =>
    (r.ingredients || [])
      .filter((ing) => ing.substituted_from)
      .map((ing) => ({
        from: ing.substituted_from.name,
        to:   ing.name,
        note: ing.substituted_from.note ?? '',
      }))
  );

  const supplierGroups = groupBySupplier(cart);

  return (
    <div className="space-y-4">
      {subs.length > 0 && <SubstitutionAlert subs={subs} />}

      {supplierGroups.length === 0 ? (
        <EmptyState message="No supplier-linked items in your cart." icon="📦" />
      ) : (
        supplierGroups.map((g) => <SupplierCard key={g.id} group={g} />)
      )}
    </div>
  );
}

function SubstitutionAlert({ subs }) {
  return (
    <div className="bg-[#FFF7DC] border-2 border-[#F5C518] rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-5 h-5 text-[#A8893E] shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <h3 className="text-[15px] font-bold text-[#1A1A1A]">Smart Substitutions Applied</h3>
          <p className="text-[13px] text-[#6B6B6B] mt-0.5">
            Some ingredients were out of stock. We've suggested alternatives based on your recipes.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {subs.map((s, i) => (
          <div key={i} className="bg-white/60 border border-[#F0E2A8] rounded-lg px-3 py-2.5 flex items-start gap-3">
            <Package className="w-4 h-4 text-[#A8893E] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="text-[13px]">
              <div className="text-[#1A1A1A]">
                <span className="line-through text-[#9E9E9E]">{s.from}</span>
                <span className="mx-1.5">→</span>
                <span className="font-semibold">{s.to}</span>
              </div>
              {s.note && <div className="text-[12px] text-[#6B6B6B] mt-0.5">{s.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupplierCard({ group }) {
  return (
    <article className="bg-white rounded-2xl border border-[#EBEBEB] p-5">
      <header className="flex items-center justify-between gap-3 pb-4 border-b border-[#EBEBEB] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EBEBEB] flex items-center justify-center">
            <Package className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#1A1A1A]">{group.name}</h3>
            {group.distance != null && (
              <div className="flex items-center gap-1 text-[12px] text-[#6B6B6B] mt-0.5">
                <MapPin className="w-3 h-3" strokeWidth={1.5} />
                {group.distance} miles away
              </div>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F5F5] text-[#6B6B6B] text-[12px] font-semibold rounded-md">
          <Package className="w-3 h-3" strokeWidth={1.5} />
          {group.items.length} item{group.items.length === 1 ? '' : 's'}
        </span>
      </header>

      <ul className="divide-y divide-[#EBEBEB]">
        {group.items.map((it, i) => (
          <li key={i} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#1A1A1A]">{it.label}</div>
                {it.sub_label && (
                  <div className="text-[12px] text-[#6B6B6B] mt-0.5">{it.sub_label}</div>
                )}
                {it.is_substitution && (
                  <span className="inline-flex items-center mt-1.5 px-2 py-0.5 bg-[#FFF7DC] text-[#8A6E00] text-[11px] font-semibold rounded-md">
                    Substitution
                  </span>
                )}
              </div>
              <div className="text-[14px] font-semibold text-[#1A1A1A] shrink-0">
                ${it.price.toFixed(2)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DeliveryStep({ address, onAddressChange, notes, onNotesChange }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-5 flex items-center gap-2">
        <Truck className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
        Delivery Information
      </h2>

      <Field label="Delivery Address" required>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="123 Main St, Apt 4B, City, State 12345"
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Delivery Notes (Optional)">
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g., Leave at door, Ring doorbell"
          className={INPUT_CLASS}
        />
      </Field>

      <div className="bg-[#FAEFCB] border border-[#F0E2A8] rounded-xl px-4 py-3">
        <div className="text-[13px] font-semibold text-[#5A4A1A]">Estimated Delivery</div>
        <div className="text-[12px] text-[#5A4A1A] mt-0.5">
          Your meal kit will arrive within 2–3 business days.
        </div>
      </div>
    </div>
  );
}

function PaymentStep({ value, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-5 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
        Payment Method
      </h2>

      <div className="space-y-3">
        <PaymentOption
          id="wallet"
          checked={value === 'wallet'}
          onSelect={() => onChange('wallet')}
          icon={<Wallet className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}
          title="Recipe Room Wallet"
          subtitle="You have sufficient balance for this order"
          right={
            <span className="px-2.5 py-1 bg-[#1B3A2D] text-white text-[12px] font-bold rounded-md">
              $150.00
            </span>
          }
        />
        <PaymentOption
          id="card"
          checked={value === 'card'}
          onSelect={() => onChange('card')}
          icon={<CreditCard className="w-5 h-5 text-[#6B6B6B]" strokeWidth={1.5} />}
          title="Credit/Debit Card"
          subtitle="Pay securely with your card"
        />
      </div>
    </div>
  );
}

function PaymentOption({ checked, onSelect, icon, title, subtitle, right }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ' +
        (checked
          ? 'border-[#1B3A2D] bg-[#F5F8F6]'
          : 'border-[#EBEBEB] hover:border-[#D0D0D0]')
      }
    >
      <span
        className={
          'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ' +
          (checked ? 'border-[#1B3A2D]' : 'border-[#D0D0D0]')
        }
      >
        {checked && <span className="w-2 h-2 rounded-full bg-[#1B3A2D]" />}
      </span>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-[#1A1A1A]">{title}</span>
        <span className="block text-[12px] text-[#6B6B6B] mt-0.5">{subtitle}</span>
      </span>
      {right}
    </button>
  );
}

function Sidebar({ cart, step, submitting, onNext, onBack, onComplete }) {
  const sub   = cartSubtotal(cart);
  const total = cartTotal(cart);

  return (
    <aside className="bg-white rounded-2xl border border-[#EBEBEB] p-6 sticky top-24">
      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Order Summary</h2>

      <ul className="space-y-2 mb-4">
        {cart.recipes.map((r) => (
          <li key={r.recipe_id}>
            <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">{r.title}</div>
            <div className="text-[12px] text-[#6B6B6B]">{r.servings} serving{r.servings === 1 ? '' : 's'}</div>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 text-[14px] mb-3 pt-3 border-t border-[#EBEBEB]">
        <div className="flex items-center justify-between">
          <span className="text-[#6B6B6B]">Subtotal</span>
          <span className="text-[#1A1A1A] font-semibold">${sub.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6B6B6B]">Delivery Fee</span>
          <span className="text-[#1A1A1A] font-semibold">${DELIVERY_FEE.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#EBEBEB] mb-5">
        <span className="text-[15px] font-bold text-[#1A1A1A]">Total</span>
        <span className="text-[18px] font-bold text-[#1A1A1A]">${total.toFixed(2)}</span>
      </div>

      {step === 'payment' ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onComplete}
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <CreditCard className="w-4 h-4" strokeWidth={1.5} />
          {submitting ? 'Placing order…' : 'Complete Order'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      {step !== 'review' && (
        <button
          type="button"
          onClick={onBack}
          className="w-full mt-2 py-3 bg-white text-[#1A1A1A] border border-[#D0D0D0] rounded-lg text-[14px] font-semibold hover:border-[#1B3A2D] transition-colors"
        >
          Back
        </button>
      )}

      <ul className="mt-5 space-y-1.5 text-[13px] text-[#6B6B6B]">
        <li>✓ Secure checkout</li>
        <li>✓ Fresh ingredients guaranteed</li>
        <li>✓ Support local suppliers & chefs</li>
      </ul>
    </aside>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">
        {label}{required && <span className="text-[#B71C1C] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full px-3 py-2.5 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors bg-white';

// flatten cart ingredients into per-supplier groups for the review step
function groupBySupplier(cart) {
  const map = new Map();

  for (const r of cart.recipes) {
    const ratio = r.servings / (r.base_servings || r.servings || 1);
    for (const ing of (r.ingredients || [])) {
      const sid  = ing.supplier?.id ?? '__no_supplier__';
      const name = ing.supplier?.name ?? 'Unknown supplier';
      const dist = ing.supplier?.distance_miles ?? null;

      if (!map.has(sid)) {
        map.set(sid, { id: sid, name, distance: dist, items: [] });
      }

      const qty = Number(ing.quantity || 0) * ratio;
      const labelLeft = qty ? `${formatQty(qty)}${ing.unit ? ing.unit + ' ' : ' '}${ing.name}` : ing.name;
      const subLabel  = ing.substituted_from
        ? `${formatQty(qty)}${ing.unit ? ing.unit : ''} ${ing.substituted_from.name}`.trim()
        : labelLeft;

      map.get(sid).items.push({
        label:           labelLeft,
        sub_label:       subLabel,
        is_substitution: !!ing.substituted_from,
        price:           (Number(ing.price) || 0) * ratio,
      });
    }
  }

  return [...map.values()];
}

function formatQty(n) {
  if (!n) return '';
  return Number.isInteger(n) ? `${n}` : `${Number(n).toFixed(2).replace(/\.?0+$/, '')}`;
}
