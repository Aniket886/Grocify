import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [config, setConfig] = useState({ provider: 'mock', methods: ['UPI', 'Card', 'Net Banking'], testMode: false });
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gatewayData, setGatewayData] = useState(null);
  const [utr, setUtr] = useState('');
  const [checking, setChecking] = useState(false);
  const pollTimer = useRef(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
    api.get('/payments/config').then((cfg) => {
      setConfig(cfg);
      if (cfg.provider === 'gateway') {
        // Automatically pre-load UPI Gateway order details
        api.post(`/payments/initiate/${id}`)
          .then((res) => setGatewayData(res.data))
          .catch((err) => console.warn('Gateway pre-initiation:', err.message));
      }
    }).catch(() => {});

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [id]);

  // Set up auto-polling for payment status when gateway is active
  useEffect(() => {
    if (config.provider === 'gateway' && order && order.status === 'Payment Pending') {
      pollTimer.current = setInterval(async () => {
        try {
          const res = await api.get(`/payments/status/${id}`);
          if (res.paid) {
            clearInterval(pollTimer.current);
            navigate(`/orders/${id}/confirmation`);
          }
        } catch {
          // ignore background poll errors
        }
      }, 3000);

      return () => {
        if (pollTimer.current) clearInterval(pollTimer.current);
      };
    }
  }, [config.provider, order, id, navigate]);

  async function checkStatusManually() {
    setChecking(true);
    setError('');
    try {
      const res = await api.get(`/payments/status/${id}`);
      if (res.paid) {
        navigate(`/orders/${id}/confirmation`);
      } else {
        setError('Payment has not been detected yet. Please ensure you completed the transaction in your UPI app, or submit your 12-digit UTR below.');
      }
    } catch (e) {
      setError(e.message || 'Error checking payment status');
    } finally {
      setChecking(false);
    }
  }

  async function submitUtrVerification(e) {
    if (e) e.preventDefault();
    if (!utr || !/^\s*\d{12}\s*$/.test(utr)) {
      setError('Please enter the 12-digit UTR / UPI Reference Number from your payment details.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await api.post(`/payments/verify-utr/${id}`, { utr: utr.trim() });
      if (res.paid) {
        navigate(`/orders/${id}/confirmation`);
      } else {
        setError(res.message || 'Could not verify UTR. Please check the number and try again.');
      }
    } catch (e) {
      setError(e.message || 'Error verifying UTR');
    } finally {
      setBusy(false);
    }
  }

  async function pay(outcome) {
    setError('');
    setBusy(true);
    try {
      if (config.provider === 'gateway') {
        let data = gatewayData;
        if (!data) {
          const initRes = await api.post(`/payments/initiate/${id}`);
          data = initRes.data;
          setGatewayData(data);
        }

        if (data?.paymentUrl) {
          window.open(data.paymentUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        await api.post(`/orders/${id}/pay`, { method, outcome });
        navigate(`/orders/${id}/confirmation`);
      }
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

  const isGateway = config.provider === 'gateway';
  const panelStyle = { margin: '16px 0', padding: '16px', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)' };

  return (
    <div className="card narrow">
      <h2>Payment</h2>
      <p>Order <b>{order.id}</b></p>
      <p>Amount to pay: <b>₹{order.total}</b></p>
      <p className="muted">Pay before {new Date(order.expiresAt).toLocaleTimeString()} or the order is cancelled.</p>
      
      {config.mock && (
        <p className="error" role="status">
          Demo mode: no real payment is taken. This server is using the mock payment provider, so "Pay" succeeds instantly. Set PAYMENT_PROVIDER=gateway to use the UPI gateway.
        </p>
      )}

      <label htmlFor="method">Payment method</label>
      <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
        {config.methods.map((m) => <option key={m}>{m}</option>)}
      </select>

      {isGateway && method === 'UPI' && (
        <div style={{ ...panelStyle, color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#0f172a' }}>🏦 Pay with UPI</h4>
            <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Bank-verified</span>
          </div>

          {gatewayData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <a
                href={gatewayData.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary"
                style={{ textAlign: 'center', display: 'inline-block', textDecoration: 'none' }}
              >
                🚀 Open UPI Payment Page & QR
              </a>
              {gatewayData.upiIntent && (
                <a
                  href={gatewayData.upiIntent}
                  className="button secondary"
                  style={{ textAlign: 'center', display: 'inline-block', textDecoration: 'none' }}
                >
                  📱 Pay with UPI Mobile App (GPay/PhonePe/Paytm)
                </a>
              )}
            </div>
          )}

          {/* Direct UTR Entry for Instant Verification */}
          <form onSubmit={submitUtrVerification} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <label htmlFor="utrInput" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Already paid? Enter the 12-digit UTR:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                id="utrInput"
                type="text"
                maxLength="12"
                pattern="\d{12}"
                inputMode="numeric"
                placeholder="e.g. 412345678901"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '1px' }}
              />
              <button type="submit" className="primary" disabled={busy || utr.length !== 12}>
                Submit UTR
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Find the 12-digit UPI Ref / UTR number in your UPI app transaction details.
            </span>
          </form>

          <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            ⚡ Your order is confirmed automatically once the matching bank credit is received. A UTR that doesn't match is held for review, never accepted blindly.
          </p>
        </div>
      )}

      {isGateway && method !== 'UPI' && (
        <div style={{ ...panelStyle, color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#0f172a' }}>{method === 'Card' ? '💳 Pay with Card' : '🏛️ Pay with Net Banking'}</h4>
            <span style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Coming soon</span>
          </div>
          {/* Placeholder only: nothing here is submitted or charged. */}
          {method === 'Card' ? (
            <fieldset disabled style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              <input placeholder="Card number" aria-label="Card number" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="MM / YY" aria-label="Expiry" style={{ flex: 1 }} />
                <input placeholder="CVV" aria-label="CVV" style={{ flex: 1 }} />
              </div>
              <input placeholder="Name on card" aria-label="Name on card" />
            </fieldset>
          ) : (
            <fieldset disabled style={{ border: 0, padding: 0, margin: 0 }}>
              <select aria-label="Choose your bank"><option>Choose your bank</option></select>
            </fieldset>
          )}
          <button className="primary" disabled style={{ marginTop: '12px' }}>Not available yet</button>
          <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            This is a placeholder for a future integration. Please choose UPI to pay now.
          </p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="row" style={{ marginTop: '12px' }}>
        {isGateway ? (
          <>
            <button className="primary" disabled={busy || checking} onClick={checkStatusManually}>
              {checking ? 'Checking...' : '✓ Refresh Status'}
            </button>
          </>
        ) : (
          <button className="primary" disabled={busy} onClick={() => pay()}>Pay ₹{order.total}</button>
        )}

        {config.testMode && (
          <button className="secondary" disabled={busy} onClick={() => pay('failure')}>
            Simulate failed payment
          </button>
        )}
        <button className="danger" disabled={busy} onClick={cancel}>Cancel order</button>
      </div>

      <p className="muted" style={{ marginTop: '16px' }}>
        Payee details are shown on the secure UPI checkout. Card, UPI and bank details are never stored by Grocify.
      </p>
    </div>
  );
}
