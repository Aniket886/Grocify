import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

// Top-of-page Diwali promo strip. Hidden when Diwali decoration is off in Settings.
export default function DiwaliBanner() {
  const { diwali } = useTheme();
  if (!diwali) return null;
  return (
    <div className="diwali-strip no-print" role="region" aria-label="Diwali highlights">
      <div className="diya-row" aria-hidden="true">
        {'🪔 ✨ 🪔 ✨ 🪔 ✨ 🪔 ✨ 🪔 ✨ 🪔'.split(' ').map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="diwali-content">
        <div>
          <h3 className="title">Festival of Lights is here</h3>
          <p className="subtitle">Diwali gifting, lights and decor at warm prices. Dry fruits, sweets, pooja thalis and more.</p>
        </div>
        <div className="chips">
          <Link to="/s/diwali" className="diwali-chip">🎁 Diwali Gifting</Link>
          <Link to="/c/diwali-lights" className="diwali-chip">🪔 Diwali Lights</Link>
          <Link to="/c/diwali-decor" className="diwali-chip">🌼 Decor</Link>
          <Link to="/c/sweets" className="diwali-chip">🍬 Sweets</Link>
          <Link to="/c/dry-fruits" className="diwali-chip">🥜 Dry Fruits</Link>
        </div>
      </div>
    </div>
  );
}
