import { Fragment, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const STATUSES = ['Payment Pending', 'Order Placed', 'Cancelled'];

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [status]);

  async function cancel(id) {
    setError('');
    if (!window.confirm(`Cancel order ${id}? Stock will be restored.`)) return;
    try { await api.post(`/orders/${id}/cancel`); await load(); } catch (e) { setError(e.message); }
  }

  return (
    <>
      <h2>Orders</h2>
      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Placed</th><th></th></tr></thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan="6">No orders.</td></tr>}
          {orders.map((o) => (
            <Fragment key={o.id}>
              <tr>
                <td>{o.id}</td>
                <td>{o.customer?.name}<div className="muted">{o.customer?.email}</div></td>
                <td>₹{o.total}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>
                  <button className="secondary" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? 'Hide' : 'Details'}</button>{' '}
                  {o.status === 'Payment Pending' && <button className="danger" onClick={() => cancel(o.id)}>Cancel</button>}
                </td>
              </tr>
              {open === o.id && (
                <tr>
                  <td colSpan="6">
                    <ul>{o.items.map((i) => <li key={i.productId}>{i.name} × {i.quantity} (₹{i.price * i.quantity})</li>)}</ul>
                    <div>Deliver to: {o.address.line}, {o.address.city} {o.address.pincode} · {o.address.phone || 'no phone'}</div>
                    <div className="muted">{o.payment ? `Paid by ${o.payment.method}, transaction ${o.payment.transactionId}` : `Payment: ${o.paymentStatus} (${o.attempts} attempt${o.attempts === 1 ? '' : 's'})`}</div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
