import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const blank = { name: '', description: '', categoryId: '', price: '', stock: '', lowStockLimit: '' };

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const [p, c] = await Promise.all([api.get('/products?includeInactive=false'), api.get('/categories')]);
    setProducts(p.products);
    setCategories(c.categories);
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      editingId ? await api.put(`/products/${editingId}`, form) : await api.post('/products', form);
      setForm(blank); setEditingId(null);
      await load();
    } catch (err) { setError(err.message); }
  }

  function edit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, categoryId: p.categoryId, price: p.price, stock: p.stock, lowStockLimit: p.lowStockLimit });
    window.scrollTo({ top: 0 });
  }

  async function remove(p) {
    setError('');
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try { await api.del(`/products/${p.id}`); await load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
      <form className="card" onSubmit={save}>
        <div className="row">
          <input placeholder="Name" required value={form.name} onChange={set('name')} />
          <select required value={form.categoryId} onChange={set('categoryId')} aria-label="Category">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="row"><input placeholder="Description" value={form.description} onChange={set('description')} /></div>
        <div className="row">
          <input type="number" min="0" step="0.01" placeholder="Price (₹)" required value={form.price} onChange={set('price')} />
          <input type="number" min="0" step="1" placeholder="Stock" required value={form.stock} onChange={set('stock')} />
          <input type="number" min="0" step="1" placeholder="Low-stock limit" value={form.lowStockLimit} onChange={set('lowStockLimit')} />
        </div>
        <div className="row">
          <button className="primary">{editingId ? 'Update' : 'Add product'}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</button>}
        </div>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

      <h2>All products</h2>
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td><td>{catName(p.categoryId)}</td><td>₹{p.price}</td>
              <td>{p.stock} <span className={`badge ${p.availability}`}>{p.availability.replace('_', ' ')}</span></td>
              <td>
                <button className="secondary" onClick={() => edit(p)}>Edit</button>{' '}
                <button className="danger" onClick={() => remove(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
