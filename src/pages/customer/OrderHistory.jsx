import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useCart } from '../../context/CartContext.jsx';

// Order history with real-time delivery status synchronization:
// • Reflects completed / delivered orders immediately from tracking updates.
// • Order Again: pushes each item of a past order into the cart.
// • Print: calls window.print().
export default function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [, setTick] = useState(0);
  const { refresh } = useCart();
  const [params] = useSearchParams();

  const load = () => api.get('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));

  useEffect(() => { 
    load(); 

    // Listen for storage changes or order update events to immediately reflect simulated status changes
    const onUpdate = () => {
      setTick((t) => t + 1);
      load();
    };
    window.addEventListener('storage', onUpdate);
    window.addEventListener('grocify_order_updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('grocify_order_updated', onUpdate);
    };
  }, []);

  useEffect(() => {
    if (params.get('reorder') === '1' && orders && orders.length > 0) {
      requestAnimationFrame(() => document.getElementById('order-again-hint')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [orders, params]);

  const getEffectiveStatus = (order) => {
    if (!order) return '';
    if (order.status === 'Cancelled' || order.status === 'Payment Pending') return order.status;
    try {
      const savedStatus = localStorage.getItem(`grocify_demo_order_status_${order.id}`);
      if (savedStatus) return savedStatus;
      const savedStep = localStorage.getItem(`grocify_demo_step_${order.id}`);
      if (savedStep !== null) {
        const STEPS = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
        const idx = parseInt(savedStep, 10);
        if (!isNaN(idx) && STEPS[idx]) return STEPS[idx];
      }
    } catch { /* storage fallback */ }
    return order.status;
  };

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
        </div>
      {error && <p className="error" role="alert">{error}</p>}
      {orders.length === 0 && <p>No orders yet. <Link to="/products">Start shopping</Link></p>}
      {params.get('reorder') === '1' && orders.length > 0 && (
        <p id="order-again-hint" className="muted">Tap “Order Again” on a past order to fill your cart with the same items.</p>
      )}
      {orders.map((o) => {
        const effectiveStatus = getEffectiveStatus(o);
        const isDelivered = effectiveStatus === 'Delivered';

        return (
          <div className={`card ${isDelivered ? 'order-card-completed' : ''}`} key={o.id} style={{ marginBottom: 12 }}>
            <div className="row">
              <b style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{o.id}</span>
                {isDelivered && (
                  <span className="order-completed-indicator" title="Order delivered successfully">
                    ✓ Completed
                  </span>
                )}
              </b>
              <StatusBadge status={effectiveStatus} />
            </div>
            <div className="muted">{new Date(o.createdAt).toLocaleString()} · Total ₹{o.total}</div>
            <ul>{o.items.map((i) => <li key={i.productId}>{i.name} × {i.quantity} (₹{i.price * i.quantity})</li>)}</ul>
            {o.payment && <div className="muted">Paid by {o.payment.method} · Transaction {o.payment.transactionId}</div>}
            {o.status === 'Cancelled' && <div className="muted">{o.cancelReason}</div>}
            <div className="row" style={{ marginTop: 8 }}>
              {o.delivery && (
                <Link to={`/orders/${o.id}/track`}>
                  <button className="secondary">
                    {isDelivered ? 'View Delivery Details' : 'Track order'}
                  </button>
                </Link>
              )}
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
        );
      })}
    </>
  );
}
