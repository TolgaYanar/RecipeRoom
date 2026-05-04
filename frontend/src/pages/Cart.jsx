import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ChefHat, MapPin, ArrowRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import useCart from '../hooks/useCart';
import {
  removeRecipe, updateServings, recipeSubtotal, cartSubtotal, cartTotal, DELIVERY_FEE,
} from '../lib/cart';

export default function Cart() {
  const cart = useCart();
  const recipes = cart.recipes;

  if (recipes.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF6E8]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] mb-8">Cart</h1>
          <EmptyState
            icon="🛒"
            message="Your cart is empty."
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

  return (
    <div className="min-h-screen bg-[#FAF6E8]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] leading-tight">Cart</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            {recipes.length} recipe{recipes.length === 1 ? '' : 's'} ready to checkout
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
          <div className="space-y-4">
            {recipes.map((r) => <RecipeRow key={r.recipe_id} recipe={r} />)}
          </div>

          <OrderSummarySidebar />
        </div>
      </div>
    </div>
  );
}

function RecipeRow({ recipe: r }) {
  const subtotal = recipeSubtotal(r);

  return (
    <article className="bg-white rounded-2xl border border-[#EBEBEB] p-5">
      <div className="flex items-start gap-4">
        <div className="w-[120px] h-[120px] rounded-xl overflow-hidden bg-[#FAF8F5] shrink-0">
          {r.image_url ? (
            <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9E9E9E]">
              <ChefHat className="w-8 h-8" strokeWidth={1} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="text-[16px] font-bold text-[#1A1A1A]">{r.title}</h3>
            <button
              type="button"
              onClick={() => removeRecipe(r.recipe_id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#B71C1C] hover:bg-[#FFEBEE] transition-colors shrink-0"
              aria-label={`Remove ${r.title}`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {r.description && (
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-2 line-clamp-2">
              {r.description}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-2 mb-3">
            {r.cuisine    && <Pill>{r.cuisine}</Pill>}
            {r.difficulty && <Pill>{capitalize(r.difficulty)}</Pill>}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E8F1EC] text-[#1B5E20] text-[12px] font-semibold rounded-md">
              <MapPin className="w-3 h-3" strokeWidth={1.5} />
              Local
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#6B6B6B]">Servings:</span>
              <Stepper
                value={r.servings}
                onChange={(v) => updateServings(r.recipe_id, v)}
              />
            </div>
            <div className="text-[13px] text-[#6B6B6B]">
              {(r.ingredients || []).length} ingredient{(r.ingredients || []).length === 1 ? '' : 's'}
            </div>
            {subtotal > 0 && (
              <div className="text-[14px] font-semibold text-[#1A1A1A]">
                ${subtotal.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderSummarySidebar() {
  const cart = useCart();
  const navigate = useNavigate();
  const sub = cartSubtotal(cart);
  const total = cartTotal(cart);

  return (
    <aside className="bg-white rounded-2xl border border-[#EBEBEB] p-6 sticky top-24">
      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Order Summary</h2>

      <div className="space-y-1.5 text-[14px] mb-4">
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

      <button
        type="button"
        onClick={() => navigate('/checkout')}
        className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] transition-colors"
      >
        Proceed to Checkout
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <ul className="mt-5 space-y-1.5 text-[13px] text-[#6B6B6B]">
        <li>• Fresh ingredients from local suppliers</li>
        <li>• Exact portions for your recipes</li>
        <li>• Support verified chefs</li>
      </ul>
    </aside>
  );
}

function Stepper({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <StepperButton onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="w-3 h-3" strokeWidth={1.5} />
      </StepperButton>
      <span className="text-[14px] font-semibold w-6 text-center">{value}</span>
      <StepperButton onClick={() => onChange(value + 1)}>
        <Plus className="w-3 h-3" strokeWidth={1.5} />
      </StepperButton>
    </div>
  );
}

function StepperButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-md border border-[#D0D0D0] flex items-center justify-center hover:border-[#1B3A2D] transition-colors"
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return (
    <span className="px-2.5 py-1 bg-[#F5F5F5] text-[#1A1A1A] text-[12px] font-medium rounded-md">
      {children}
    </span>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
