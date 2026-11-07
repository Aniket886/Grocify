import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import DeliveryTimeline from '../../components/DeliveryTimeline.jsx';

const STEPS = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  // Demo auto-progression & countdown state
  const demoKey = `grocify_demo_step_${id}`;
  const [demoStep, setDemoStep] = useState(() => {
    try {
      const saved = localStorage.getItem(demoKey);
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [secondsRemaining, setSecondsRemaining] = useState(720); // 12 minutes = 720 seconds
  const [autoPlay, setAutoPlay] = useState(true);

  const load = () => api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [id]);

  // Sync with backend status if backend is already ahead
  useEffect(() => {
    if (order && order.status && STEPS.includes(order.status)) {
      const backendIdx = STEPS.indexOf(order.status);
      setDemoStep((prev) => Math.max(prev, backendIdx));
    }
  }, [order?.status]);

  // Save demo step to localStorage and synchronize with backend in real-time
  useEffect(() => {
    const currentStatus = STEPS[demoStep];
    try {
      localStorage.setItem(demoKey, demoStep.toString());
      localStorage.setItem(`grocify_demo_order_status_${id}`, currentStatus);
      window.dispatchEvent(new CustomEvent('grocify_order_updated', {
        detail: { orderId: id, status: currentStatus, step: demoStep }
      }));
    } catch { /* storage blocked */ }

    // Sync to backend so My Orders and database immediately reflect the new status
    if (order && order.id && order.status !== 'Cancelled' && order.status !== 'Payment Pending') {
      if (order.status !== currentStatus) {
        api.post(`/orders/${id}/progress`, { step: currentStatus })
          .then((res) => {
            if (res?.order) setOrder(res.order);
          })
          .catch(() => {
            // graceful fallback if network/sync fails
          });
      }
    }
  }, [demoStep, demoKey, id, order?.id, order?.status]);

  // Live countdown timer (around 12 minutes total, countdown adjusts based on step)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (demoStep >= 4) return 0; // Delivered
        if (prev <= 1) return 1;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [demoStep]);

  // Auto-advance delivery step for demo evaluation (every 14 seconds advances to next step)
  useEffect(() => {
    if (!autoPlay || demoStep >= 4) return undefined;
    const interval = setInterval(() => {
      setDemoStep((prev) => {
        const next = Math.min(prev + 1, 4);
        return next;
      });
    }, 14000);
    return () => clearInterval(interval);
  }, [autoPlay, demoStep]);

  // Adjust remaining countdown when step manually jumps
  function advanceStep(newStep) {
    setDemoStep(newStep);
    if (newStep === 0) setSecondsRemaining(720); // 12m
    else if (newStep === 1) setSecondsRemaining(540); // 9m
    else if (newStep === 2) setSecondsRemaining(360); // 6m
    else if (newStep === 3) setSecondsRemaining(120); // 2m
    else if (newStep === 4) setSecondsRemaining(0); // Delivered
  }

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Loading tracking information…</p>;

  const effectiveStatus = (order.status === 'Cancelled' || order.status === 'Payment Pending')
    ? order.status
    : (STEPS[demoStep] || order.status);

  const orderDate = new Date(order.createdAt || Date.now());
  const estimatedArrival = new Date(orderDate.getTime() + 12 * 60 * 1000);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  // Build synthesized delivery history including demo progress
  const simulatedHistory = STEPS.slice(0, demoStep + 1).map((stepName, idx) => ({
    status: stepName,
    at: new Date(orderDate.getTime() + idx * 2.5 * 60 * 1000).toISOString(),
  }));

  const simulatedDelivery = {
    ...(order.delivery || {}),
    status: effectiveStatus,
    history: simulatedHistory,
    assignedTo: demoStep >= 2 ? (order.delivery?.assignedTo || 'Rohan Sharma (Express Partner)') : null,
  };

  return (
    <div className="card tracking-dashboard-card">
      <div className="tracking-header">
        <div>
          <span className="tracking-badge">⚡ Real-Time Tracking</span>
          <h2 style={{ margin: '6px 0 2px' }}>Order {order.id}</h2>
          <p className="muted">Placed on {orderDate.toLocaleString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={effectiveStatus} />
        </div>
      </div>

      {/* Estimated Arrival Banner (Target ~12 minutes) */}
      <div className="eta-banner-box">
        <div className="eta-visual">
          <span className="eta-icon">{demoStep >= 4 ? '🎉' : '⏱️'}</span>
          <div>
            <div className="eta-title">
              {demoStep >= 4 ? 'Package Delivered' : 'Estimated Time to Reach'}
            </div>
            <div className="eta-countdown">
              {demoStep >= 4 ? (
                <span className="delivered-text">Delivered Safely</span>
              ) : (
                <span>~{minutes}m {seconds < 10 ? `0${seconds}` : seconds}s ({estimatedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              )}
            </div>
          </div>
        </div>
        <div className="eta-pill">
          {demoStep >= 4 ? 'Completed' : '⚡ 12-Min Express Delivery'}
        </div>
      </div>

      {/* Demo Controller Strip (for HR & Evaluation Demo) */}
      <div className="demo-controller-panel">
        <div className="demo-label">
          <strong>Interactive Demo Steps:</strong>
          <span>Current: <b style={{ color: 'var(--primary)' }}>{STEPS[demoStep]}</b></span>
        </div>
        <div className="demo-actions">
          <button 
            type="button" 
            className="demo-btn" 
            disabled={demoStep >= 4}
            onClick={() => advanceStep(Math.min(demoStep + 1, 4))}
          >
            Advance Step ⏩
          </button>
          <button 
            type="button" 
            className="demo-btn ghost"
            onClick={() => advanceStep(0)}
          >
            Reset ↺
          </button>
          <button 
            type="button" 
            className={`demo-btn ${autoPlay ? 'active' : ''}`}
            onClick={() => setAutoPlay(!autoPlay)}
            title="Toggle automatic step progression every 14s"
          >
            {autoPlay ? 'Auto-Play: ON' : 'Auto-Play: OFF'}
          </button>
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="timeline-container">
        <DeliveryTimeline delivery={simulatedDelivery} currentStepIndex={demoStep} />
      </div>

      {/* Assigned Delivery Driver Details */}
      {demoStep >= 2 && (
        <div className="driver-info-card">
          <div className="driver-avatar">🛵</div>
          <div className="driver-details">
            <strong>Rohan Sharma</strong>
            <span className="driver-meta">Grocify Express Courier • EV Scooter #KA-05-8842</span>
          </div>
          <a href="tel:+919876543210" className="driver-call-btn">Call Driver 📞</a>
        </div>
      )}

      {/* Delivery Destination */}
      <div className="delivery-address-card">
        <div className="addr-icon">📍</div>
        <div>
          <strong>Delivery Destination:</strong>
          <p className="muted" style={{ margin: 0 }}>
            {order.address.line}, {order.address.city} - {order.address.pincode}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link to="/orders"><button className="secondary">← Back to My Orders</button></Link>
        <Link to="/"><button className="ghost">Continue Shopping</button></Link>
      </div>
    </div>
  );
}
