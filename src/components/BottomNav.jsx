import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Small-screen navigation. Mirrors the top bar for one-tap access to the key
// actions the brief asks for: Home, Category, Order Again, Print.
// All of these route to existing screens; no server call is added here.
export default function BottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  if (isAdmin) return null;                        // admin uses the full top bar

  function printPage() { window.print(); }
  function openOrderAgain() {
    if (!user) return navigate('/login');
    navigate('/orders?reorder=1');
  }

  return (
    <nav className="bottom-nav" aria-label="Quick">
      <NavLink to="/" end>
        {({ isActive }) => (
          <span className={isActive ? 'active' : ''}>
            <span className="icon" aria-hidden="true">🏠</span>
            Home
          </span>
        )}
      </NavLink>
      <NavLink to="/categories">
        {({ isActive }) => (
          <span className={isActive ? 'active' : ''}>
            <span className="icon" aria-hidden="true">🗂️</span>
            Category
          </span>
        )}
      </NavLink>
      <button type="button" onClick={openOrderAgain} aria-label="Order again">
        <span className="icon" aria-hidden="true">🔁</span>
        Order Again
      </button>
      <button type="button" onClick={printPage} aria-label="Print this page">
        <span className="icon" aria-hidden="true">🖨️</span>
        Print
      </button>
    </nav>
  );
}
