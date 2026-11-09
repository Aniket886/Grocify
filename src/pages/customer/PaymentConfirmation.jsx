import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function PaymentConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [showItems, setShowItems] = useState(false);

  useEffect(() => { api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message)); }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <div className="conf-shell"><div className="conf-loading"><span className="pay-spinner" /> Loading order details…</div></div>;
  if (!order.payment) {
    return <div className="conf-shell"><div className="conf-body"><h2>No payment yet</h2><p>This order has not been paid.</p><Link to={`/payment/${order.id}`} className="button primary">Pay now</Link></div></div>;
  }

  const paidAt = order.payment.paidAt ? new Date(order.payment.paidAt) : new Date();

  return (
    <div className="conf-shell printable">
      <div className="conf-hero">
        <div className="conf-check-ring">
          <svg className="conf-check-svg" viewBox="0 0 52 52" fill="none" aria-hidden="true">
            <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="3" />
            <path className="conf-check-path" d="M15 27l7 7 15-15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="conf-title">Payment Successful</h1>
        <p className="conf-subtitle">Your order has been confirmed and is being prepared.</p>
      </div>

      <div className="conf-receipt">
        <div className="conf-amount-row">
          <span className="conf-amount">₹{order.payment.amount}</span>
          <span className="conf-paid-badge">Paid</span>
        </div>

        <div className="conf-details">
          <div className="conf-detail"><span>Order ID</span><strong>{order.id}</strong></div>
          <div className="conf-detail"><span>Transaction ID</span><strong className="conf-mono">{order.payment.transactionId}</strong></div>
          <div className="conf-detail"><span>Payment method</span><strong>{order.payment.method}</strong></div>
          <div className="conf-detail"><span>Date</span><strong>{paidAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {paidAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
        </div>

        <button type="button" className="conf-toggle" onClick={() => setShowItems(!showItems)}>
          {showItems ? 'Hide' : 'Show'} items ({order.items.length})
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showItems ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {showItems && (
          <div className="conf-items">
            {order.items.map((i) => (
              <div className="conf-item" key={i.productId}>
                <span>{i.name} <span className="conf-qty">&times;{i.quantity}</span></span>
                <span>₹{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="conf-item conf-total"><span>Total</span><span>₹{order.total}</span></div>
          </div>
        )}

        {order.address && (
          <div className="conf-addr">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span>Delivering to {order.address.line}, {order.address.city} {order.address.pincode}</span>
          </div>
        )}
      </div>

      <div className="conf-actions no-print">
        <Link to={`/orders/${order.id}/track`} className="button primary conf-cta">Track your order</Link>
        <div className="conf-secondary-actions">
          <Link to="/orders" className="conf-link">My orders</Link>
          <span className="conf-dot">&middot;</span>
          <Link to="/" className="conf-link">Continue shopping</Link>
          <span className="conf-dot">&middot;</span>
          <button type="button" className="conf-link" onClick={() => window.print()}>Print receipt</button>
        </div>
      </div>
    </div>
  );
}
