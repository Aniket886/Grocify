import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { SECTION_BY_SLUG, backendMatchesDisplay } from '../../data/categoryTaxonomy.js';

// Section landing. Shows every category inside the section and marks the ones
// that have no products yet with a small "coming soon" badge.
export default function Section() {
  const { slug } = useParams();
  const section = SECTION_BY_SLUG[slug];
  const [backend, setBackend] = useState([]);
  useEffect(() => { api.get('/categories').then((d) => setBackend(d.categories)).catch(() => setBackend([])); }, []);

  if (!section) {
    return (
      <>
        <h1>Section not found</h1>
        <p>We could not find that section. <Link to="/categories">Browse all categories</Link></p>
      </>
    );
  }

  const comingSoon = (cat) => !backend.some((bc) => backendMatchesDisplay(bc.name, cat));

  return (
    <>
      <h1>
        <span aria-hidden="true">{section.icon}</span> {section.name}
      </h1>
      <p className="muted">{section.tagline}</p>

      <div className="category-grid" style={{ marginTop: 16 }}>
        {section.categories.map((c) => (
          <Link
            key={c.slug}
            to={`/c/${c.slug}`}
            className={`category-tile ${c.featured ? 'featured' : ''} ${c.discreet ? 'discreet' : ''}`}
          >
            <span className="icon" aria-hidden="true">{c.icon}</span>
            <span>{c.name}</span>
            {comingSoon(c) && <span className="empty-badge">soon</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
