import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { SECTIONS } from '../../data/categoryTaxonomy.js';
import DiwaliBanner from '../../components/DiwaliBanner.jsx';

// Home page. Brings together the hero, the Diwali strip, the display
// sections and the backend categories the admin edits. Nothing here calls
// anything new on the server; only /categories (already used before).
export default function Home() {
  const [backendCats, setBackendCats] = useState([]);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.get('/categories').then((d) => setBackendCats(d.categories)).catch(() => {}); }, []);

  const featured = SECTIONS.filter((s) => s.festive || s.slug === 'electronics' || s.slug === 'gifting' || s.slug === 'grocery-kitchen' || s.slug === 'snacks-drinks' || s.slug === 'beauty-personal-care').slice(0, 6);
  const browse = SECTIONS;

  return (
    <>
      <DiwaliBanner />

      <section className="hero" aria-label="Welcome">
        <h1>
          Find everyday <span className="accent">essentials</span>, gifting and gadgets —
          <br />delivered fresh.
        </h1>
        <p>Groceries, beauty, electronics, decor, pet care and more. One cart, one checkout, one delivery.</p>
        <form className="hero-search" onSubmit={(e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(q)}`); }}>
          <input placeholder='Try "banana", "headphones" or "diya"' value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="primary">Search</button>
        </form>
        <div className="hero-cta">
          <Link to="/categories"><button className="ghost">🗂️ Browse categories</button></Link>
          <Link to="/s/diwali"><button className="secondary">🪔 Diwali Store</button></Link>
        </div>
      </section>

      <h2>Shop by section</h2>
      <p className="muted" style={{ marginBottom: 14 }}>Big worlds, neatly sorted.</p>
      <div className="section-grid">
        {featured.map((s) => (
          <Link key={s.slug} to={`/s/${s.slug}`} className={`section-tile accent-${s.accent}`}>
            <span className="icon" aria-hidden="true">{s.icon}</span>
            <span className="name">{s.name}</span>
            <span className="tagline">{s.tagline}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ marginTop: 28 }}>All sections</h2>
      <div className="section-grid">
        {browse.map((s) => (
          <Link key={s.slug} to={`/s/${s.slug}`} className={`section-tile accent-${s.accent}`}>
            <span className="icon" aria-hidden="true">{s.icon}</span>
            <span className="name">{s.name}</span>
            <span className="tagline">{s.tagline}</span>
          </Link>
        ))}
      </div>

      {backendCats.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>Live catalogue</h2>
          <p className="muted" style={{ marginBottom: 14 }}>Categories the admin has stocked right now.</p>
          <div className="category-grid">
            {backendCats.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`} className="category-tile">
                <span className="icon" aria-hidden="true">🏷️</span>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
