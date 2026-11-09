import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';


const svg = (d) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const METHOD_ICONS = {
  UPI: svg(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3m4 0v4h-4m-3-1v1" /></>),
  Card: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  'Net Banking': svg(<path d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />),
};

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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
          const res = await api.get(`/payments/status/${id}?local=1`);
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
    if (pollTimer.current) clearInterval(pollTimer.current);
    try {
      const res = await api.post(`/payments/verify-utr/${id}`, { utr: utr.trim(), gatewayOrderId: gatewayData?.orderId });
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
  const secsLeft = Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now) / 1000));
  const timeLeft = `${String(Math.floor(secsLeft / 60)).padStart(2, '0')}:${String(secsLeft % 60).padStart(2, '0')}`;
  const qrSrc = gatewayData?.orderId ? `${config.gatewayUrl}/pay/${gatewayData.orderId}/qr.svg` : null;

  return (
    <div className="pay-shell">
      <header className="pay-summary">
        <div>
          <div className="pay-eyebrow">Order {order.id}</div>
          <div className="pay-amount">₹{order.total}</div>
        </div>
        <div className={`pay-timer${secsLeft < 120 ? ' low' : ''}`} title="Time left to pay">
          <span aria-hidden="true">⏱</span> {timeLeft}
        </div>
      </header>

      <div className="pay-tabs" role="tablist" aria-label="Payment method">
        {config.methods.map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={method === m}
            className={`pay-tab${method === m ? ' active' : ''}`}
            onClick={() => { setMethod(m); setError(''); }}
          >
            {METHOD_ICONS[m]}
            {m}
          </button>
        ))}
      </div>

      {config.mock && (
        <div className="pay-note warn" role="status">
          Demo mode: no real payment is taken. "Pay" succeeds instantly because this server uses the mock payment provider.
        </div>
      )}

      <section className="pay-body">
        {!isGateway && (
          <>
            <p className="pay-lead">Pay securely with {method}.</p>
            <button className="primary pay-cta" disabled={busy} onClick={() => pay()}>Pay ₹{order.total}</button>
            {config.testMode && (
              <button className="secondary pay-cta" disabled={busy} onClick={() => pay('failure')}>Simulate failed payment</button>
            )}
          </>
        )}

        {isGateway && method === 'UPI' && (
          <>
            {!gatewayData ? (
              <div className="pay-loading"><span className="pay-spinner" /> Preparing your secure payment…</div>
            ) : (
              <>
                <div className="pay-qr-wrap">
                  {qrSrc && (
                    <div className="pay-qr">
                      <img src={qrSrc} alt="UPI QR code" width="200" height="200" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="pay-qr-text">
                    <strong>Scan &amp; pay</strong>
                    <span>Open any UPI app, scan the QR and approve the payment of ₹{order.total}.</span>
                    <div className="pay-apps" aria-label="Supported apps">
                      {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => <span key={a}>{a}</span>)}
                    </div>
                  </div>
                </div>

                <div className="pay-actions">
                  {gatewayData.upiIntent && (
                    <a className="button primary pay-cta" href={gatewayData.upiIntent}>Pay with UPI app</a>
                  )}
                  <a className="button secondary pay-cta" href={gatewayData.paymentUrl} target="_blank" rel="noopener noreferrer">
                    Open payment page
                  </a>
                </div>

                <div className="pay-status" aria-live="polite">
                  <span className="pay-spinner" />
                  <span>Waiting for your payment. This page updates automatically.</span>
                  <button type="button" className="pay-link" disabled={checking} onClick={checkStatusManually}>
                    {checking ? 'Checking…' : 'Refresh'}
                  </button>
                </div>

                <div className="pay-divider"><span>Already paid?</span></div>

                <form onSubmit={submitUtrVerification} className="pay-utr">
                  <label htmlFor="utrInput">UPI reference number (UTR)</label>
                  <div className="pay-utr-row">
                    <input
                      id="utrInput"
                      type="text"
                      maxLength="12"
                      pattern="\d{12}"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12-digit number"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                    />
                    <button type="submit" className="primary" disabled={busy || utr.length !== 12}>
                      {busy ? 'Confirming…' : 'Confirm payment'}
                    </button>
                  </div>
                  <small>Find it in your UPI app under the payment details (shown as UTR or UPI Ref. No.).</small>
                </form>
              </>
            )}
          </>
        )}

        {isGateway && method !== 'UPI' && (
          <div className="pay-soon">
            <div className="pay-soon-head">
              <strong>{method === 'Card' ? 'Pay with card' : 'Pay with net banking'}</strong>
              <span className="pay-pill">Coming soon</span>
            </div>
            {/* Placeholder only: nothing here is submitted or charged. */}
            <fieldset disabled className="pay-fields">
              {method === 'Card' ? (
                <>
                  <input placeholder="Card number" aria-label="Card number" />
                  <div className="pay-utr-row">
                    <input placeholder="MM / YY" aria-label="Expiry" />
                    <input placeholder="CVV" aria-label="CVV" />
                  </div>
                  <input placeholder="Name on card" aria-label="Name on card" />
                </>
              ) : (
                <select aria-label="Choose your bank"><option>Choose your bank</option></select>
              )}
            </fieldset>
            <button className="primary pay-cta" disabled>Not available yet</button>
            <p className="pay-lead">This option is coming soon. Please choose UPI to pay now.</p>
          </div>
        )}

        {error && <div className="pay-note error" role="alert">{error}</div>}
      </section>

      <footer className="pay-foot">
        <span><span aria-hidden="true">🔒</span> Secure payment. Card, UPI and bank details are never stored by Grocify.</span>
        <button type="button" className="pay-link danger" disabled={busy} onClick={cancel}>Cancel order</button>
      </footer>
    </div>
  );
}
