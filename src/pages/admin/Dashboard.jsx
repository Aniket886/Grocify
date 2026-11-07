import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/reports/sales'), api.get('/inventory?lowOnly=true'), api.get('/admin/deliveries')])
      .then(([sales, low, del]) => setStats({
        revenue: sales.totals.revenue,
        orders: sales.totals.orders,
        pending: sales.totals.pendingPayment,
        inDelivery: del.orders.filter((o) => o.status !== 'Delivered').length,
        lowStock: low.products.length,
      }))
      .catch((e) => setError(e.message));
  }, []);

  if (!stats) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  const cards = [
    ['Revenue (paid orders)', `₹${stats.revenue}`, '/admin/reports'],
    ['Total orders', stats.orders, '/admin/orders'],
    ['Awaiting payment', stats.pending, '/admin/orders'],
    ['Paid, not yet delivered', stats.inDelivery, '/admin/deliveries'],
    ['Low-stock products', stats.lowStock, '/admin/inventory'],
  ];

  return (
    <>
      <h2>Admin dashboard</h2>
      <div className="grid">
        {cards.map(([label, value, to]) => (
          <Link key={label} to={to} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="muted">{label}</div>
            <h2 style={{ margin: '6px 0 0' }}>{value}</h2>
          </Link>
        ))}
      </div>
    </>
  );
}
