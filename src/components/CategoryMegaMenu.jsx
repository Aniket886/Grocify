import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SECTIONS } from '../data/categoryTaxonomy.js';

// Category mega-menu. Opens from the hamburger icon in the navbar.
// A section list on the left; the chosen section's categories on the right.
// Portaled directly to document.body to ensure it renders with a true global z-index above all navigation overlays.
export default function CategoryMegaMenu({ isOpen, onToggle, onClose }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : localOpen;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setLocalOpen((v) => !v);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setLocalOpen(false);
  };

  const [activeSlug, setActiveSlug] = useState(SECTIONS[0].slug);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      handleClose();
    };
    const onEsc = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const active = SECTIONS.find((s) => s.slug === activeSlug) || SECTIONS[0];

  return (
    <div className="mega-wrap">
      <button 
        ref={btnRef}
        type="button" 
        className={`mega-btn-hamburger ${open ? 'active' : ''}`}
        aria-haspopup="menu" 
        aria-expanded={open} 
        aria-label="Browse categories"
        title="Browse categories"
        onClick={handleToggle}
      >
        <span className="hamburger-box" aria-hidden="true">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </span>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div 
            className="mega-backdrop" 
            onClick={handleClose} 
            aria-hidden="true" 
          />
          <div className="mega-panel" role="menu" ref={menuRef}>
            <div className="mega-sections">
              <Link to="/categories" className="mega-section-btn" onClick={handleClose}>
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
              <Link to={`/s/${active.slug}`} className="mega-cat mega-cat-all" onClick={handleClose}>
                <span className="icon" aria-hidden="true">{active.icon}</span> All of {active.name}
              </Link>
              {active.categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/c/${c.slug}`}
                  className="mega-cat"
                  onClick={handleClose}
                >
                  <span className="icon" aria-hidden="true">{c.icon}</span> {c.name}
                </Link>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
