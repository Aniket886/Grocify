import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useCart } from '../../context/CartContext.jsx';

// Order history. New here:
// • Order Again: pushes each item of a past order into the cart via the
//   existing POST /cart/items endpoint. No new server route is used.
// • Print: calls window.print(). The printable CSS hides navigation.
// • When the page opens with ?reorder=1 (from the bottom nav), it scrolls to
//   the most recent completed order so "order again" is one tap away.
export default function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const { refresh } = useCart();
  const [params] = useSearchParams();

  const load = () => api.get('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (params.get('reorder') === '1' && orders && orders.length > 0) {
      requestAnimationFrame(() => document.getElementById('order-again-hint')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [orders, params]);

  async function cancel(id) {
    setError('');
    try { await api.post(`/orders/${id}/cancel`); await load(); } catch (e) { setError(e.message); }
  }

  async function orderAgain(order) {
    setError('');
    setBusy(order.id);
    let added = 0;
    let skipped = 0;
    for (const item of order.items) {
      try {
        await api.post('/cart/items', { productId: item.productId, quantity: item.quantity });
        added += 1;
      } catch { skipped += 1; }
    }
    setBusy('');
    await refresh();
    if (added === 0) setError('None of those items are available right now.');
    else if (skipped) setError(`${added} added. ${skipped} items are no longer available.`);
    else setError('');
  }

  if (!orders) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1, margin: 0 }}>My orders</h2>
        <button className="ghost" onClick={() => window.print()} aria-label="Print orders">🖨️ Print</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {orders.length === 0 && <p>No orders yet. <Link to="/products">Start shopping</Link></p>}
      {params.get('reorder') === '1' && orders.length > 0 && (
        <p id="order-again-hint" className="muted">Tap “Order Again” on a past order to fill your cart with the same items.</p>
      )}
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
          <div className="row">
            {o.delivery && <Link to={`/orders/${o.id}/track`}><button className="secondary">Track order</button></Link>}
            {o.paymentStatus === 'paid' && (
              <button
                className="ghost"
                onClick={() => orderAgain(o)}
                disabled={busy === o.id}
                aria-label={`Order again: ${o.items.map((i) => i.name).join(', ')}`}
              >🔁 {busy === o.id ? 'Adding…' : 'Order Again'}</button>
            )}
            {o.status === 'Payment Pending' && (
              <>
                <Link to={`/payment/${o.id}`}><button className="primary">Pay now</button></Link>
                <button className="danger" onClick={() => cancel(o.id)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
