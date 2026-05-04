// localStorage-backed cart. Each recipe entry carries the ingredient
// rows the buyer picked — supplier + any substitutes included —
// so /cart and /checkout don't need to refetch.

// Same-window writes don't fire the native 'storage' event, so we
// dispatch a custom 'rr-cart-changed' event for the Navbar badge.

const KEY = 'rr_cart';

export const CART_EVENT = 'rr-cart-changed';

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { recipes: [] };
    const parsed = JSON.parse(raw);
    return parsed?.recipes ? parsed : { recipes: [] };
  } catch {
    return { recipes: [] };
  }
}

export function setCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function clearCart() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addRecipeToCart(entry) {
  const cart = getCart();
  // replace existing entry for the same recipe rather than duplicating
  const next = cart.recipes.filter((r) => r.recipe_id !== entry.recipe_id);
  next.push(entry);
  setCart({ ...cart, recipes: next });
}

export function removeRecipe(recipeId) {
  const cart = getCart();
  setCart({ ...cart, recipes: cart.recipes.filter((r) => r.recipe_id !== recipeId) });
}

export function updateServings(recipeId, servings) {
  const cart = getCart();
  setCart({
    ...cart,
    recipes: cart.recipes.map((r) =>
      r.recipe_id === recipeId ? { ...r, servings: Math.max(1, servings) } : r
    ),
  });
}

export function recipeCount(cart = getCart()) {
  return cart.recipes.length;
}

// stored prices are for the recipe's base servings — scale by the
// requested-vs-base ratio. Ingredients with no price contribute 0,
// since we don't fabricate numbers for the buyer.
export function recipeSubtotal(recipe) {
  const ratio = (recipe.servings || 1) / (recipe.base_servings || recipe.servings || 1);
  return (recipe.ingredients || []).reduce((sum, ing) => {
    const price = Number(ing.price) || 0;
    return sum + price * ratio;
  }, 0);
}

export function cartSubtotal(cart = getCart()) {
  return cart.recipes.reduce((sum, r) => sum + recipeSubtotal(r), 0);
}

export const DELIVERY_FEE = 4.99;

export function cartTotal(cart = getCart()) {
  const sub = cartSubtotal(cart);
  return sub > 0 ? sub + DELIVERY_FEE : 0;
}
