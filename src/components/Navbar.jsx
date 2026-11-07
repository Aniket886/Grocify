import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import CategoryMegaMenu from './CategoryMegaMenu.jsx';

// Professional Pill Navbar with Glassmorphism
// - Primary Pill: Brand on Left, User Profile & Hamburger on the Complete Right Side
// - Sub-Nav Pill Strip: Positioned directly under the navbar (Home, Shop, Cart, My Orders, Notifications)
// - Synchronized state: Hides the sub-nav strip whenever the hamburger dropdown is open so it NEVER overlays.
export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== 'customer') { setUnread(0); return undefined; }
    const load = () => api.get('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user, location.pathname]);

  // Automatically close hamburger mega-menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`navbar-wrapper ${menuOpen ? 'mega-menu-open' : ''}`}>
      {/* 1. Main Floating Pill Navbar */}
      <nav className="navbar-pill-primary" aria-label="Main navigation">
        <div className="nav-left-group">
          <Link to={user?.role === 'admin' ? '/admin' : '/'} className="nav-brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-dot" aria-hidden="true">✦</span>
            <span className="brand-name">Grocify</span>
          </Link>
        </div>

        <div className="nav-right-group">
          {user ? (
            <div className="user-pill-container">
              <NavLink to="/profile" className="user-profile-badge" title="View Profile" onClick={() => setMenuOpen(false)}>
                <span className="avatar-icon" aria-hidden="true">👤</span>
                <span className="user-name-text">{user.name.split(' ')[0]}</span>
              </NavLink>
              <button 
                type="button"
                className="nav-logout-btn" 
                onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                title="Log out of your account"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-btn-cluster">
              <NavLink to="/login" className="auth-login-link" onClick={() => setMenuOpen(false)}>Login</NavLink>
              <NavLink to="/register" className="auth-join-pill" onClick={() => setMenuOpen(false)}><span className="join-full">Join Grocify</span><span className="join-short">Join</span></NavLink>
            </div>
          )}

          {/* Hamburger menu on the COMPLETE right side */}
          {user?.role !== 'admin' && (
            <CategoryMegaMenu 
              isOpen={menuOpen} 
              onToggle={() => setMenuOpen((v) => !v)} 
              onClose={() => setMenuOpen(false)} 
            />
          )}
        </div>
      </nav>

      {/* 2. Sub-Navigation Bar positioned UNDER the navbar */}
      <nav className="navbar-sub-strip" aria-label="Quick links">
        <div className="sub-strip-pill">
          {user?.role !== 'admin' && (
            <>
              <NavLink to="/" end className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>
                <span className="pill-icon" aria-hidden="true">🏠</span> Home
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>
                <span className="pill-icon" aria-hidden="true">🛍️</span> Shop
              </NavLink>
              {user?.role === 'customer' && (
                <>
                  <NavLink to="/cart" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>
                    <span className="pill-icon" aria-hidden="true">🛒</span> Cart {count > 0 && <span className="cart-badge-count">{count}</span>}
                  </NavLink>
                  <NavLink to="/orders" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>
                    <span className="pill-icon" aria-hidden="true">📦</span> My Orders
                  </NavLink>
                  <NavLink to="/notifications" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>
                    <span className="pill-icon" aria-hidden="true">🔔</span> Notifications
                    {unread > 0 && <span className="unread-dot" aria-label={`${unread} unread notifications`} />}
                  </NavLink>
                </>
              )}
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/admin/orders" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Orders</NavLink>
              <NavLink to="/admin/deliveries" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Deliveries</NavLink>
              <NavLink to="/admin/payments" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Payments</NavLink>
              <NavLink to="/admin/customers" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Customers</NavLink>
              <NavLink to="/admin/inventory" className={({ isActive }) => `sub-pill-link ${isActive ? 'active' : ''}`}>Inventory</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
