import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

// Settings page: Relocated directly into the user account dashboard.
export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  return (
    <div className="card narrow" style={{ maxWidth: 540, margin: '24px auto' }}>
      <h2>⚙️ Settings &amp; Preferences</h2>
      <p className="muted">Personal preferences and appearance controls have been moved directly to your account dashboard.</p>

      <div style={{ marginTop: 20 }}>
        <h3>Appearance</h3>
        <div className="row" role="radiogroup" aria-label="Theme">
          <button
            type="button"
            className={theme === 'dark' ? 'primary' : 'ghost'}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >🌙 Dark (default)</button>
          <button
            type="button"
            className={theme === 'light' ? 'primary' : 'ghost'}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >☀️ Light</button>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <Link to="/profile">
          <button className="primary" style={{ width: '100%' }}>Go to Account Dashboard →</button>
        </Link>
      </div>
    </div>
  );
}
