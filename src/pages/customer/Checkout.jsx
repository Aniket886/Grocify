import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';

export default function Checkout() {
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ line: user.address?.line || '', city: user.address?.city || '', pincode: user.address?.pincode || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // One key per checkout screen: if the button is clicked twice, the server creates only one order.
  const idempotencyKey = useRef(crypto.randomUUID());
  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  if (cart.lines.length === 0) {
    return <><h2>Checkout</h2><p>Your cart is empty.</p><Link to="/products">Browse products</Link></>;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { order } = await api.post('/orders', { address }, { 'Idempotency-Key': idempotencyKey.current });
      await refresh();
      navigate(`/payment/${order.id}`);
    } catch (err) {
      setError(err.message);
      await refresh().catch(() => {}); // cart may have changed (e.g. item sold out)
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Checkout</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        {cart.lines.map((l) => (
          <div className="row" key={l.product.id}><span style={{ flex: 1 }}>{l.product.name} × {l.quantity}</span><span>₹{l.subtotal}</span></div>
        ))}
        <h3>Total: ₹{cart.total}</h3>
      </div>
      <form className="card" onSubmit={submit}>
        <h3>Delivery address</h3>
        <label htmlFor="line">Address</label>
        <input id="line" required value={address.line} onChange={set('line')} />
        <label htmlFor="city">City</label>
        <input id="city" required value={address.city} onChange={set('city')} />
        <label htmlFor="pincode">PIN code</label>
        <input id="pincode" required value={address.pincode} onChange={set('pincode')} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row"><button className="primary" disabled={busy}>Place order and pay</button></div>
        <p className="muted">Stock is held for you while you pay. Unpaid orders are cancelled after a few minutes.</p>
      </form>
    </>
  );
}
