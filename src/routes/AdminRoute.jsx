import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Admin-only pages. (The server enforces this too; this just hides the screens.)
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}
