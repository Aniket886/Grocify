import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { SECTIONS } from '../../data/categoryTaxonomy.js';

// Home page. Clean, niche e-commerce storefront with centered, justified layout
// and responsive optimization across mobile, tablet, laptop, and desktop.
export default function Home() {
  const [backendCats, setBackendCats] = useState([]);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories')
      .then((d) => setBackendCats(d.categories || []))
      .catch(() => {});
  }, []);

  const featuredSlugs = ['artisanal', 'grocery-kitchen', 'electronics', 'gifting', 'beauty-personal-care', 'imported'];
  const featured = SECTIONS.filter((s) => featuredSlugs.includes(s.slug)).slice(0, 6);
  const browse = SECTIONS;

  return (
    <div className="home-container">
      {/* Centered & Justified Hero Section */}
      <section className="hero hero-centered" aria-label="Welcome">
        <div className="hero-badge">✦ Curated Niche Store</div>
        <h1 className="hero-title">
          Artisanal Provisions &amp; <span className="accent">Mindful Living</span>,<br />
          delivered fresh.
        </h1>
        <p className="hero-tagline">
          Organic pantry staples, single-origin specialties, crafted gifting, and everyday electronics. Quality without compromise, sustainably packaged and swiftly delivered directly to your doorstep in minutes.
        </p>
        
        <form 
          className="hero-search" 
          onSubmit={(e) => { 
            e.preventDefault(); 
            if (q.trim()) navigate(`/products?q=${encodeURIComponent(q.trim())}`); 
          }}
        >
          <input 
            placeholder='Try "organic honey", "cold-pressed oil" or "headphones"' 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            aria-label="Search provisions"
          />
          <button type="submit" className="primary">Search</button>
        </form>

        <div className="hero-cta">
          <Link to="/products"><button className="primary">Explore Store</button></Link>
          <Link to="/s/artisanal"><button className="secondary">✨ Artisanal &amp; Gourmet</button></Link>
          <Link to="/categories"><button className="ghost">🗂️ All Categories</button></Link>
        </div>
      </section>

      {/* Symmetrical Niche Perks Row */}
      <div className="niche-perks-row" role="region" aria-label="Store highlights">
        <div className="perk-item">
          <span className="perk-icon" aria-hidden="true">🌿</span>
          <div>
            <strong>Pure Origin</strong>
            <span className="perk-desc">Artisanal &amp; certified organic</span>
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon" aria-hidden="true">⚡</span>
          <div>
            <strong>Swift Delivery</strong>
            <span className="perk-desc">Freshly packed to doorstep</span>
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon" aria-hidden="true">🔄</span>
          <div>
            <strong>360° Inspection</strong>
            <span className="perk-desc">Interactive product visualizer</span>
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon" aria-hidden="true">🔒</span>
          <div>
            <strong>Secure Checkout</strong>
            <span className="perk-desc">Encrypted digital payments</span>
          </div>
        </div>
      </div>

      {/* Featured Collections Section */}
      <div className="landing-section-header">
        <h2>Featured Collections</h2>
        <p className="section-subtitle">
          Hand-picked artisanal goods, fresh organic produce, and mindful lifestyle selections.
        </p>
      </div>
      <div className="section-grid featured-grid">
        {featured.map((s) => (
          <Link key={s.slug} to={`/s/${s.slug}`} className={`section-tile accent-${s.accent}`}>
            <span className="icon" aria-hidden="true">{s.icon}</span>
            <span className="name">{s.name}</span>
            <span className="tagline">{s.tagline}</span>
          </Link>
        ))}
      </div>

      {/* All Collections Section */}
      <div className="landing-section-header" style={{ marginTop: 44 }}>
        <h2>All Collections</h2>
        <p className="section-subtitle">
          Explore our complete catalog spanning fresh groceries, pantry staples, personal care, and curated treats.
        </p>
      </div>
      <div className="section-grid all-collections-grid">
        {browse.map((s) => (
          <Link key={s.slug} to={`/s/${s.slug}`} className={`section-tile accent-${s.accent}`}>
            <span className="icon" aria-hidden="true">{s.icon}</span>
            <span className="name">{s.name}</span>
            <span className="tagline">{s.tagline}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
