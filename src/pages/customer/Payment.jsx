import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [config, setConfig] = useState({ methods: ['UPI', 'Card', 'Net Banking'], testMode: false });
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
    api.get('/payments/config').then(setConfig).catch(() => {});
  }, [id]);

  async function pay(outcome) {
    setError('');
    setBusy(true);
    try {
      await api.post(`/orders/${id}/pay`, { method, outcome });
      navigate(`/orders/${id}/confirmation`);
    } catch (e) {
      setError(e.status === 402 ? 'Payment failed. Your order is still held, so you can try again.' : e.message);
      api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    try { await api.post(`/orders/${id}/cancel`); navigate('/orders'); } catch (e) { setError(e.message); }
  }

  if (!order) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  if (order.status !== 'Payment Pending') {
    return (
      <div className="card narrow">
        <h2>Order {order.id}</h2>
        <p><StatusBadge status={order.status} /></p>
        <p>{order.status === 'Cancelled' ? 'This order was cancelled and cannot be paid.' : 'This order is already paid.'}</p>
        <Link to="/orders">My orders</Link>
      </div>
    );
  }

  return (
    <div className="card narrow">
      <h2>Payment</h2>
      <p>Order <b>{order.id}</b></p>
      <p>Amount to pay: <b>₹{order.total}</b></p>
      <p className="muted">Pay before {new Date(order.expiresAt).toLocaleTimeString()} or the order is cancelled.</p>
      <label htmlFor="method">Payment method</label>
      <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
        {config.methods.map((m) => <option key={m}>{m}</option>)}
      </select>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="primary" disabled={busy} onClick={() => pay()}>Pay ₹{order.total}</button>
        {config.testMode && <button className="secondary" disabled={busy} onClick={() => pay('failure')}>Simulate failed payment</button>}
        <button className="danger" disabled={busy} onClick={cancel}>Cancel order</button>
      </div>
      <p className="muted">
        {config.testMode ? 'Test mode: no real money moves.' : 'You will pay securely with the payment provider.'} Card, UPI and bank details are never stored by Grocify.
      </p>
    </div>
  );
}
