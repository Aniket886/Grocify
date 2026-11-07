import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PaymentConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message)); }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p>Loading…</p>;
  if (!order.payment) {
    return <div className="card narrow"><h2>No payment yet</h2><p>This order has not been paid.</p><Link to={`/payment/${order.id}`}>Pay now</Link></div>;
  }

  return (
    <div className="card narrow">
      <h2 className="success">Payment successful</h2>
      <p>Order ID: <b>{order.id}</b></p>
      <p>Transaction ID: <b>{order.payment.transactionId}</b></p>
      <p>Method: {order.payment.method}<br />Amount paid: ₹{order.payment.amount}</p>
      <p>Status: <StatusBadge status={order.status} /></p>
      <h3>Items</h3>
      {order.items.map((i) => <div className="row" key={i.productId}><span style={{ flex: 1 }}>{i.name} × {i.quantity}</span><span>₹{i.price * i.quantity}</span></div>)}
      <p className="muted">Delivering to {order.address.line}, {order.address.city} {order.address.pincode}</p>
      <div className="row"><Link to={`/orders/${order.id}/track`}>Track this order</Link><Link to="/orders">View my orders</Link></div>
    </div>
  );
}
