import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {}); }, []);

  return (
    <>
      <h1>Fresh groceries, delivered.</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(q)}`); }}>
        <input placeholder="Search for products" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="primary">Search</button>
      </form>
      <h2>Shop by category</h2>
      <div className="grid">
        {categories.map((c) => (
          <Link key={c.id} to={`/products?category=${c.id}`} className="card"><b>{c.name}</b></Link>
        ))}
      </div>
    </>
  );
}
