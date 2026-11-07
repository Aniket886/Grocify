import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

// Mobile bottom app bar for streamlined one-thumb navigation.
// Includes live cart count badge and quick access to Home, Shop, Cart, and Orders/Profile.
export default function BottomNav() {
  const { user } = useAuth();
  const { count } = useCart();

  if (user?.role === 'admin') return null; // Admin uses top admin navigation bar

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <span className="icon" aria-hidden="true">🏠</span>
        <span>Home</span>
      </NavLink>

      <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
        <span className="icon" aria-hidden="true">🛍️</span>
        <span>Shop</span>
      </NavLink>

      <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
        <span className="icon-wrapper">
          <span className="icon" aria-hidden="true">🛒</span>
          {count > 0 && <span className="bottom-cart-badge">{count}</span>}
        </span>
        <span>Cart</span>
      </NavLink>

      {user ? (
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon" aria-hidden="true">📦</span>
          <span>Orders</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon" aria-hidden="true">👤</span>
          <span>Login</span>
        </NavLink>
      )}

      {user && (
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon" aria-hidden="true">👤</span>
          <span>Profile</span>
        </NavLink>
      )}
    </nav>
  );
}
