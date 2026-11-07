import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import CategoryMegaMenu from './CategoryMegaMenu.jsx';

// Top navigation. Keeps every login/role rule from before: the mega menu is
// public, carts and orders need a login, admin pages need the admin role.
export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user?.role !== 'customer') { setUnread(0); return undefined; }
    const load = () => api.get('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user, location.pathname]);

  return (
    <nav className="navbar" aria-label="Main">
      <Link to={user?.role === 'admin' ? '/admin' : '/'} className="brand">
        <span className="mark" aria-hidden="true">✦</span> Grocify
      </Link>

      {user?.role !== 'admin' && <CategoryMegaMenu />}

      {user?.role !== 'admin' && (
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
      )}
      {user?.role !== 'admin' && (
        <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Shop</NavLink>
      )}

      {user?.role === 'customer' && (
        <>
          <NavLink to="/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Cart ({count})</NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Orders</NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Notifications{unread > 0 ? <span className="unread-dot" aria-label={`${unread} unread`} /> : null}
          </NavLink>
        </>
      )}

      {user?.role === 'admin' && (
        <>
          <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Orders</NavLink>
          <NavLink to="/admin/deliveries" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Deliveries</NavLink>
          <NavLink to="/admin/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Payments</NavLink>
          <NavLink to="/admin/customers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Customers</NavLink>
          <NavLink to="/admin/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Inventory</NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Products</NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Categories</NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Reports</NavLink>
        </>
      )}

      <span className="nav-divider" aria-hidden="true" />

      {user ? (
        <>
          <NavLink to={user.role === 'admin' ? '/profile' : '/profile'} className="nav-pill">
            <span aria-hidden="true">👤</span> {user.name.split(' ')[0]}
          </NavLink>
          <button onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </>
      ) : (
        <>
          <NavLink to="/login" className="nav-link">Login</NavLink>
          <NavLink to="/register" className="nav-pill">Join Grocify</NavLink>
        </>
      )}
    </nav>
  );
}
