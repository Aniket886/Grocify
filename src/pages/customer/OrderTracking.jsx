import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import DeliveryTimeline from '../../components/DeliveryTimeline.jsx';

const STEPS = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

const STEP_INFO = {
  'Order Placed': { company: 'Grocify HQ', action: 'Order confirmed and sent to warehouse', icon: '📋' },
  'Packed': { company: 'Grocify Warehouse', action: 'Items picked, quality-checked and packed', icon: '📦' },
  'Shipped': { company: 'Grocify Logistics Hub', action: 'Package dispatched via express courier', icon: '🚚' },
  'Out for Delivery': { company: 'Local Delivery Station', action: 'Driver assigned and en route to your address', icon: '🛵' },
  'Delivered': { company: 'Your Doorstep', action: 'Handed over and confirmed by recipient', icon: '🏠' },
};

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const demoKey = `grocify_demo_step_${id}`;
  const [demoStep, setDemoStep] = useState(() => {
    try { const s = localStorage.getItem(demoKey); return s !== null ? parseInt(s, 10) : 0; } catch { return 0; }
  });
  const [secondsRemaining, setSecondsRemaining] = useState(720);
  const [autoPlay, setAutoPlay] = useState(true);

  const load = () => api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [id]);

  useEffect(() => {
    if (order?.status && STEPS.includes(order.status)) {
      setDemoStep((prev) => Math.max(prev, STEPS.indexOf(order.status)));
    }
  }, [order?.status]);

  useEffect(() => {
    const currentStatus = STEPS[demoStep];
    try { localStorage.setItem(demoKey, demoStep.toString()); } catch {}
    if (order?.id && order.status !== 'Cancelled' && order.status !== 'Payment Pending' && order.status !== currentStatus) {
      api.post(`/orders/${id}/progress`, { step: currentStatus }).then((res) => { if (res?.order) setOrder(res.order); }).catch(() => {});
    }
  }, [demoStep, demoKey, id, order?.id, order?.status]);

  useEffect(() => {
    const t = setInterval(() => setSecondsRemaining((p) => demoStep >= 4 ? 0 : Math.max(1, p - 1)), 1000);
    return () => clearInterval(t);
  }, [demoStep]);

  useEffect(() => {
    if (!autoPlay || demoStep >= 4) return;
    const t = setInterval(() => setDemoStep((p) => Math.min(p + 1, 4)), 14000);
    return () => clearInterval(t);
  }, [autoPlay, demoStep]);

  function advanceStep(n) {
    setDemoStep(n);
    const times = [720, 540, 360, 120, 0];
    setSecondsRemaining(times[n] || 0);
  }

  if (error) return <p className="error">{error}</p>;
  if (!order) return <div className="track-shell"><div className="conf-loading"><span className="pay-spinner" /> Loading tracking…</div></div>;

  const effectiveStatus = (order.status === 'Cancelled' || order.status === 'Payment Pending') ? order.status : (STEPS[demoStep] || order.status);
  const orderDate = new Date(order.createdAt || Date.now());
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;

  const simulatedHistory = STEPS.slice(0, demoStep + 1).map((s, i) => ({
    status: s, at: new Date(orderDate.getTime() + i * 2.5 * 60 * 1000).toISOString(),
  }));
  const simulatedDelivery = {
    ...(order.delivery || {}),
    status: effectiveStatus,
    history: simulatedHistory,
    assignedTo: demoStep >= 2 ? (order.delivery?.assignedTo || 'Rohan Sharma') : null,
  };

  const currentInfo = STEP_INFO[effectiveStatus] || STEP_INFO['Order Placed'];

  return (
    <div className="track-shell">
      {/* Header */}
      <header className="track-header">
        <div>
          <div className="track-eyebrow">Order {order.id}</div>
          <div className="track-status-row">
            <span className={`track-badge ${demoStep >= 4 ? 'done' : ''}`}>
              {demoStep >= 4 ? 'Delivered' : effectiveStatus}
            </span>
          </div>
        </div>
        <div className="track-eta">
          {demoStep >= 4 ? (
            <><span className="track-eta-label">Delivered</span><span className="track-eta-icon">🎉</span></>
          ) : (
            <>
              <span className="track-eta-label">Arrives in</span>
              <span className="track-eta-time">{mins}:{secs < 10 ? `0${secs}` : secs}</span>
            </>
          )}
        </div>
      </header>

      {/* Live status card */}
      <div className="track-live">
        <span className="track-live-icon">{currentInfo.icon}</span>
        <div>
          <strong>{currentInfo.company}</strong>
          <span className="track-live-action">{currentInfo.action}</span>
        </div>
        {demoStep < 4 && <span className="track-live-pulse" />}
      </div>

      {/* Timeline */}
      <div className="track-timeline">
        <DeliveryTimeline delivery={simulatedDelivery} currentStepIndex={demoStep} />
      </div>

      {/* Driver card */}
      {demoStep >= 2 && demoStep < 5 && (
        <div className="track-driver">
          <div className="track-driver-avatar">🛵</div>
          <div className="track-driver-info">
            <strong>Rohan Sharma</strong>
            <span>Grocify Express &middot; EV Scooter #KA-05-8842</span>
          </div>
        </div>
      )}

      {/* Delivery address */}
      {order.address && (
        <div className="track-addr">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <div>
            <strong>Delivery address</strong>
            <span>{order.address.line}, {order.address.city} {order.address.pincode}</span>
          </div>
        </div>
      )}

      {/* Order summary */}
      <details className="track-items">
        <summary>Order summary ({order.items.length} item{order.items.length !== 1 ? 's' : ''}) &middot; ₹{order.total}</summary>
        <div className="track-items-list">
          {order.items.map((i) => (
            <div className="track-item" key={i.productId}>
              <span>{i.name} <span className="conf-qty">&times;{i.quantity}</span></span>
              <span>₹{(i.price * i.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Demo controls (subtle) */}
      <div className="track-demo">
        <span className="track-demo-label">Demo controls</span>
        <div className="track-demo-btns">
          <button type="button" disabled={demoStep >= 4} onClick={() => advanceStep(Math.min(demoStep + 1, 4))}>Next step</button>
          <button type="button" onClick={() => advanceStep(0)}>Reset</button>
          <button type="button" className={autoPlay ? 'active' : ''} onClick={() => setAutoPlay(!autoPlay)}>
            Auto {autoPlay ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="track-foot">
        <Link to="/orders" className="button secondary">My orders</Link>
        <Link to="/" className="button ghost">Continue shopping</Link>
      </div>
    </div>
  );
}
