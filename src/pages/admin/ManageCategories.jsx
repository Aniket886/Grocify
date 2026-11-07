import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // category being renamed
  const [error, setError] = useState('');

  const load = () => api.get('/categories').then((d) => setCategories(d.categories));
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      editing ? await api.put(`/categories/${editing.id}`, { name }) : await api.post('/categories', { name });
      setName(''); setEditing(null);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(c) {
    setError('');
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await api.del(`/categories/${c.id}`); await load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <h2>Categories</h2>
      <form className="row" onSubmit={save}>
        <input placeholder="Category name" required value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary">{editing ? 'Rename' : 'Add'}</button>
        {editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setName(''); }}>Cancel</button>}
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>
                <button className="secondary" onClick={() => { setEditing(c); setName(c.name); }}>Edit</button>{' '}
                <button className="danger" onClick={() => remove(c)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
