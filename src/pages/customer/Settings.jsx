import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Settings page.
export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="card narrow">
      <h2>Settings</h2>
      <p className="muted">Personal preferences. Changes apply to your browser only.</p>

      <h3 style={{ marginTop: 20 }}>Appearance</h3>
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
      <p className="muted">
        Grocify is dark by default for a modern visual tone. You can switch to light mode at any time.
      </p>

      {user && (
        <>
          <h3 style={{ marginTop: 20 }}>Account</h3>
          <div className="row">
            <Link to="/profile"><button className="secondary">Edit profile and address</button></Link>
          </div>
        </>
      )}
    </div>
  );
}
