import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const EMPTY = { lines: [], total: 0 };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);

  const refresh = useCallback(async () => {
    if (user?.role === 'customer') setCart(await api.get('/cart'));
    else setCart(EMPTY);
  }, [user]);

  useEffect(() => { refresh().catch(() => setCart(EMPTY)); }, [refresh]);

  // Each action returns the server's updated cart (server calculates the total).
  const value = {
    cart,
    refresh,
    count: cart.lines.reduce((n, l) => n + l.quantity, 0),
    add: async (productId, quantity = 1) => setCart(await api.post('/cart/items', { productId, quantity })),
    setQuantity: async (productId, quantity) => setCart(await api.patch(`/cart/items/${productId}`, { quantity })),
    remove: async (productId) => setCart(await api.del(`/cart/items/${productId}`)),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
