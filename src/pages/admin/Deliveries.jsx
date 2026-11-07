import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Deliveries() {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filter, setFilter] = useState('');
  const [names, setNames] = useState({}); // typed delivery person per order
  const [error, setError] = useState('');

  const load = () => api.get(`/admin/deliveries${filter ? `?status=${encodeURIComponent(filter)}` : ''}`)
    .then((d) => { setOrders(d.orders); setStatuses(d.statuses); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, [filter]);

  const run = async (fn) => { setError(''); try { await fn(); await load(); } catch (e) { setError(e.message); } };
  const assign = (o) => run(() => api.post(`/admin/orders/${o.id}/assign`, { assignedTo: names[o.id] ?? o.delivery.assignedTo ?? '' }));
  const advance = (o, next) => run(() => api.patch(`/admin/orders/${o.id}/status`, { status: next }));
  const nextOf = (s) => statuses[statuses.indexOf(s) + 1];

  return (
    <>
      <h2>Deliveries</h2>
      <div className="row">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by delivery status">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Order</th><th>Deliver to</th><th>Status</th><th>Delivery person</th><th>Next step</th></tr></thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan="5">No paid orders yet.</td></tr>}
          {orders.map((o) => {
            const next = nextOf(o.delivery.status);
            const done = o.delivery.status === 'Delivered';
            return (
              <tr key={o.id}>
                <td>{o.id}<div className="muted">{o.customer?.name}</div></td>
                <td>{o.address.line}, {o.address.city} {o.address.pincode}</td>
                <td><StatusBadge status={o.delivery.status} /></td>
                <td>
                  {done ? o.delivery.assignedTo : (
                    <div className="row" style={{ margin: 0 }}>
                      <input style={{ minWidth: 110 }} placeholder="Name" aria-label={`Delivery person for ${o.id}`} value={names[o.id] ?? o.delivery.assignedTo ?? ''} onChange={(e) => setNames({ ...names, [o.id]: e.target.value })} />
                      <button className="secondary" onClick={() => assign(o)}>Assign</button>
                    </div>
                  )}
                </td>
                <td>{done ? 'Delivered' : <button className="primary" onClick={() => advance(o, next)}>Mark {next}</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted">Orders move one step at a time. Assign a delivery person before marking an order Shipped.</p>
    </>
  );
}
