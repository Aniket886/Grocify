import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

const LABEL = { order_confirmation: 'Order', payment_status: 'Payment', delivery_update: 'Delivery' };

export default function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/notifications').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function open(n) {
    if (!n.read) { await api.post(`/notifications/${n.id}/read`).catch(() => {}); load(); }
  }
  async function readAll() { await api.post('/notifications/read-all'); load(); }

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1, margin: 0 }}>Notifications</h2>
        {data.unreadCount > 0 && <button className="secondary" onClick={readAll}>Mark all as read</button>}
      </div>
      {data.notifications.length === 0 && <p>Nothing yet. Updates about your orders will show here.</p>}
      {data.notifications.map((n) => (
        <div key={n.id} className="card" style={{ marginBottom: 8, borderLeft: n.read ? undefined : '4px solid var(--green)' }} onClick={() => open(n)}>
          <div className="row" style={{ margin: 0 }}>
            <span className="badge">{LABEL[n.type]}</span>
            <span className="muted" style={{ marginLeft: 'auto' }}>{new Date(n.createdAt).toLocaleString()}</span>
          </div>
          <p style={{ fontWeight: n.read ? 400 : 600, margin: '6px 0' }}>{n.message}</p>
          {n.orderId && <Link to={`/orders/${n.orderId}/track`}>Track this order</Link>}
        </div>
      ))}
    </>
  );
}
