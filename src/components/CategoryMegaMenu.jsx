import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SECTIONS } from '../data/categoryTaxonomy.js';

// Category mega-menu. Opens from the "Categories" button in the navbar.
// A section list on the left; the chosen section's categories on the right.
export default function CategoryMegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(SECTIONS[0].slug);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const active = SECTIONS.find((s) => s.slug === activeSlug) || SECTIONS[0];

  return (
    <div className="mega-wrap" ref={wrapRef}>
      <button type="button" className="mega-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">≡</span> Categories
      </button>
      {open && (
        <div className="mega-panel" role="menu">
          <div className="mega-sections">
            <Link to="/categories" className="mega-section-btn" onClick={() => setOpen(false)}>
              <span className="icon" aria-hidden="true">🗂️</span> All sections
            </Link>
            {SECTIONS.map((s) => (
              <button
                key={s.slug}
                type="button"
                className={`mega-section-btn ${s.slug === activeSlug ? 'active' : ''}`}
                onMouseEnter={() => setActiveSlug(s.slug)}
                onFocus={() => setActiveSlug(s.slug)}
                onClick={() => setActiveSlug(s.slug)}
              >
                <span className="icon" aria-hidden="true">{s.icon}</span> {s.name}
              </button>
            ))}
          </div>
          <div className="mega-cats">
            <Link to={`/s/${active.slug}`} className={`mega-cat featured`} onClick={() => setOpen(false)}>
              <span className="icon" aria-hidden="true">{active.icon}</span> All of {active.name}
            </Link>
            {active.categories.map((c) => (
              <Link
                key={c.slug}
                to={`/c/${c.slug}`}
                className={`mega-cat ${c.featured ? 'featured' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="icon" aria-hidden="true">{c.icon}</span> {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
