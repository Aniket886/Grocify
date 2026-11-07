import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Unread notification count for customers: refreshed on every page change and every 30 seconds.
  useEffect(() => {
    if (user?.role !== 'customer') { setUnread(0); return undefined; }
    const load = () => api.get('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user, location.pathname]);

  return (
    <nav className="navbar">
      <Link to={user?.role === 'admin' ? '/admin' : '/'} className="brand">Grocify</Link>
      <Link to="/products">Shop</Link>
      {user?.role === 'customer' && (
        <>
          <Link to="/cart">Cart ({count})</Link>
          <Link to="/orders">My Orders</Link>
          <Link to="/notifications">Notifications{unread > 0 ? ` (${unread})` : ''}</Link>
        </>
      )}
      {user?.role === 'admin' && (
        <>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/deliveries">Deliveries</Link>
          <Link to="/admin/payments">Payments</Link>
          <Link to="/admin/customers">Customers</Link>
          <Link to="/admin/inventory">Inventory</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/categories">Categories</Link>
          <Link to="/admin/reports">Reports</Link>
        </>
      )}
      {user ? (
        <>
          <Link to="/profile">{user.name}</Link>
          <button onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
