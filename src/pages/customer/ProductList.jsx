import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import ProductCard from '../../components/ProductCard.jsx';

export default function ProductList() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => { api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (q) qs.set('q', q);
    api.get(`/products?${qs}`).then((d) => setProducts(d.products)).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [category, q]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <h2>Products</h2>
      <div className="row">
        <input placeholder="Search products" value={q} onChange={(e) => update('q', e.target.value)} />
        <select value={category} onChange={(e) => update('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}
      {loading ? <p>Loading…</p> : products.length === 0 ? <p>No products found.</p> : (
        <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} onMessage={setMsg} />)}</div>
      )}
    </>
  );
}
