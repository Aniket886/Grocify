import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import ProductCard from '../../components/ProductCard.jsx';
import { CATEGORY_BY_SLUG, SECTION_BY_SLUG, backendIdsFor } from '../../data/categoryTaxonomy.js';

// A single display category. Maps the slug to zero or more backend category
// ids by name and fetches products for each. When a display category has no
// backend match, the page shows a friendly "coming soon" state instead of
// changing the server.
export default function CategoryView() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';

  const cat = CATEGORY_BY_SLUG[slug];
  const [backend, setBackend] = useState([]);
  const [products, setProducts] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { api.get('/categories').then((d) => setBackend(d.categories)).catch(() => setBackend([])); }, []);

  const backendIds = useMemo(() => (cat ? backendIdsFor(cat, backend) : []), [cat, backend]);

  useEffect(() => {
    if (!cat) return;
    if (backend.length === 0) return;                        // wait for the backend list
    if (backendIds.length === 0) { setProducts([]); return; } // display-only category
    Promise.all(
      backendIds.map((id) => {
        const qs = new URLSearchParams({ category: id });
        if (q) qs.set('q', q);
        return api.get(`/products?${qs}`).then((d) => d.products).catch(() => []);
      }),
    ).then((lists) => {
      const seen = new Set();
      const merged = [];
      for (const list of lists) {
        for (const p of list) {
          if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
        }
      }
      setProducts(merged);
    });
  }, [cat, backend, backendIds, q]);

  if (!cat) {
    return (
      <>
        <h1>Category not found</h1>
        <p>We could not find that category. <Link to="/categories">Browse all categories</Link></p>
      </>
    );
  }
  const section = SECTION_BY_SLUG[cat.sectionSlug];

  return (
    <>
      <p className="muted">
        <Link to="/categories">All sections</Link> {' / '}
        <Link to={`/s/${cat.sectionSlug}`}>{section?.name}</Link>
      </p>
      <h1><span aria-hidden="true">{cat.icon}</span> {cat.name}</h1>

      <div className="row">
        <input placeholder={`Search in ${cat.name}`} value={q} onChange={(e) => {
          const next = new URLSearchParams(params);
          e.target.value ? next.set('q', e.target.value) : next.delete('q');
          setParams(next, { replace: true });
        }} />
      </div>

      {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}

      {products === null ? <p>Loading…</p>
        : backendIds.length === 0 ? (
          <div className="card">
            <h3>Coming soon</h3>
            <p className="muted">
              This category is part of the Grocify catalogue plan. Products appear here once an admin
              adds a matching category on the backend. Meanwhile, explore other sections.
            </p>
            <div className="row"><Link to="/categories"><button className="secondary">Browse categories</button></Link></div>
          </div>
        ) : products.length === 0 ? <p className="muted">No products here yet.</p>
          : <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} onMessage={setMsg} />)}</div>}
    </>
  );
}
