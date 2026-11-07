import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get(`/inventory${lowOnly ? '?lowOnly=true' : ''}`).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [lowOnly]);

  const lowCount = products.filter((p) => p.isLowStock).length;

  return (
    <>
      <h2>Inventory</h2>
      <div className="row">
        <label style={{ margin: 0 }}><input type="checkbox" style={{ width: 'auto' }} checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Show low stock only</label>
        <button className="secondary" onClick={load}>Refresh</button>
        <span className="muted">{lowOnly ? `${products.length} low-stock products` : `${lowCount} of ${products.length} products are low on stock`}</span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>In stock</th><th>Low-stock limit</th><th>Status</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={p.isLowStock ? { background: '#ffebee' } : undefined}>
              <td>{p.name}</td><td>{p.categoryName}</td><td>{p.stock}</td><td>{p.lowStockLimit}</td>
              <td>{p.stock <= 0 ? 'OUT OF STOCK' : p.isLowStock ? 'LOW STOCK' : 'OK'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Stock drops automatically when an order is placed, and returns if an unpaid order is cancelled or expires.</p>
    </>
  );
}
