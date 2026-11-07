import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Grocify</Link>
      <Link to="/products">Shop</Link>
      {user?.role === 'customer' && (
        <>
          <Link to="/cart">Cart ({count})</Link>
          <Link to="/orders">My Orders</Link>
        </>
      )}
      {user?.role === 'admin' && (
        <>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/inventory">Inventory</Link>
          <Link to="/admin/products">Manage Products</Link>
          <Link to="/admin/categories">Categories</Link>
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
