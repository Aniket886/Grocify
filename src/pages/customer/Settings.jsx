import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Settings page. The light-theme toggle lives here on purpose: the client
// asked for a dark-by-default site that never advertises the light option
// anywhere on the main surface. People who want it come here to flip it.
export default function Settings() {
  const { theme, setTheme, diwali, setDiwali } = useTheme();
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
        Grocify is dark by default. The light theme is yours to pick here; the rest of the site
        does not advertise it.
      </p>

      <h3 style={{ marginTop: 20 }}>Festive decoration</h3>
      <div className="row">
        <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            style={{ width: 'auto', flex: 'none', minWidth: 0 }}
            checked={diwali}
            onChange={(e) => setDiwali(e.target.checked)}
          />
          Show Diwali lights and offers
        </label>
      </div>
      <p className="muted">Turns the Diwali banner, the gift shortcuts and the light string at the top on or off.</p>

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
