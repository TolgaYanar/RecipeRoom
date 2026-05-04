import { useEffect, useState } from 'react';
import { CART_EVENT, getCart } from '../lib/cart';

// returns the current cart and re-renders on any change (same-window
// writes go through CART_EVENT; cross-tab via the native storage event)
export default function useCart() {
  const [cart, setCart] = useState(getCart);

  useEffect(() => {
    const refresh = () => setCart(getCart());
    window.addEventListener(CART_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CART_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return cart;
}
