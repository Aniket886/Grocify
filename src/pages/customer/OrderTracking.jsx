import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import DeliveryTimeline from '../../components/DeliveryTimeline.jsx';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // pick up status changes without a manual refresh
    return () => clearInterval(t);
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p>Loading…</p>;

  return (
    <div className="card narrow">
      <h2>Track order</h2>
      <p><b>{order.id}</b> <StatusBadge status={order.status} /></p>
      {order.delivery ? (
        <>
          <DeliveryTimeline delivery={order.delivery} />
          <p className="muted">{order.delivery.assignedTo ? `Delivery person: ${order.delivery.assignedTo}` : 'A delivery person has not been assigned yet.'}</p>
        </>
      ) : order.status === 'Cancelled' ? (
        <p>This order was cancelled. {order.cancelReason}</p>
      ) : (
        <p>Tracking starts after payment. <Link to={`/payment/${order.id}`}>Pay now</Link></p>
      )}
      <p className="muted">Delivering to {order.address.line}, {order.address.city} {order.address.pincode}</p>
      <Link to="/orders">Back to my orders</Link>
    </div>
  );
}
