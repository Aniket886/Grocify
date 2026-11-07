import { Link } from 'react-router-dom';
import { SECTIONS } from '../../data/categoryTaxonomy.js';

// All sections on one page. Opens from the "Category" button in the bottom
// nav or from the mega menu's "All sections" link.
export default function Categories() {
  return (
    <>
      <h1>All categories</h1>
      <p className="muted">Browse everything Grocify offers, grouped into curated sections.</p>
      <div className="section-grid" style={{ marginTop: 16 }}>
        {SECTIONS.map((s) => (
          <Link key={s.slug} to={`/s/${s.slug}`} className={`section-tile accent-${s.accent}`}>
            <span className="icon" aria-hidden="true">{s.icon}</span>
            <span className="name">{s.name}</span>
            <span className="tagline">{s.tagline}</span>
            <span className="muted" style={{ marginTop: 6 }}>{s.categories.length} categories</span>
          </Link>
        ))}
      </div>
    </>
  );
}
