import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    setError('');
    try { await api.post(`/orders/${id}/cancel`); await load(); } catch (e) { setError(e.message); }
  }

  if (!orders) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <h2>My orders</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {orders.length === 0 && <p>No orders yet. <Link to="/products">Start shopping</Link></p>}
      {orders.map((o) => (
        <div className="card" key={o.id} style={{ marginBottom: 10 }}>
          <div className="row">
            <b style={{ flex: 1 }}>{o.id}</b>
            <StatusBadge status={o.status} />
          </div>
          <div className="muted">{new Date(o.createdAt).toLocaleString()} · Total ₹{o.total}</div>
          <ul>{o.items.map((i) => <li key={i.productId}>{i.name} × {i.quantity} (₹{i.price * i.quantity})</li>)}</ul>
          {o.payment && <div className="muted">Paid by {o.payment.method} · Transaction {o.payment.transactionId}</div>}
          {o.status === 'Cancelled' && <div className="muted">{o.cancelReason}</div>}
          {o.status === 'Payment Pending' && (
            <div className="row">
              <Link to={`/payment/${o.id}`}><button className="primary">Pay now</button></Link>
              <button className="danger" onClick={() => cancel(o.id)}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
