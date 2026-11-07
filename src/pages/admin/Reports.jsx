import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams();
    if (range.from) qs.set('from', range.from);
    if (range.to) qs.set('to', range.to);
    setError('');
    api.get(`/admin/reports/sales${qs.toString() ? `?${qs}` : ''}`).then(setReport).catch((e) => setError(e.message));
  }, [range]);

  const set = (k) => (e) => setRange({ ...range, [k]: e.target.value });
  const maxRevenue = Math.max(1, ...(report?.byDay.map((d) => d.revenue) || [0]));

  return (
    <>
      <h2>Sales and order report</h2>
      <div className="row">
        <label style={{ margin: 0 }}>From <input type="date" value={range.from} onChange={set('from')} /></label>
        <label style={{ margin: 0 }}>To <input type="date" value={range.to} onChange={set('to')} /></label>
        <button className="secondary" onClick={() => setRange({ from: '', to: '' })}>All time</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {report && (
        <>
          <div className="grid">
            {[['Revenue', `₹${report.totals.revenue}`], ['Orders', report.totals.orders], ['Paid orders', report.totals.paidOrders], ['Average order', `₹${report.totals.averageOrderValue}`], ['Awaiting payment', report.totals.pendingPayment], ['Cancelled', report.totals.cancelled]].map(([l, v]) => (
              <div className="card" key={l}><div className="muted">{l}</div><h2 style={{ margin: '6px 0 0' }}>{v}</h2></div>
            ))}
          </div>

          <h3>Orders by status</h3>
          <table>
            <thead><tr><th>Status</th><th>Orders</th></tr></thead>
            <tbody>
              {Object.keys(report.byStatus).length === 0 && <tr><td colSpan="2">No orders in this range.</td></tr>}
              {Object.entries(report.byStatus).map(([s, n]) => <tr key={s}><td>{s}</td><td>{n}</td></tr>)}
            </tbody>
          </table>

          <h3>By day</h3>
          <table>
            <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th><th style={{ width: '40%' }}></th></tr></thead>
            <tbody>
              {report.byDay.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td><td>{d.orders}</td><td>₹{d.revenue}</td>
                  <td><div style={{ background: 'var(--green)', height: 12, width: `${(d.revenue / maxRevenue) * 100}%`, minWidth: d.revenue ? 4 : 0, borderRadius: 4 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Top products</h3>
          <table>
            <thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {report.topProducts.length === 0 && <tr><td colSpan="3">No paid orders in this range.</td></tr>}
              {report.topProducts.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.quantity}</td><td>₹{p.revenue}</td></tr>)}
            </tbody>
          </table>
          <p className="muted">Orders are grouped by the day they were placed. Revenue counts paid orders only.</p>
        </>
      )}
    </>
  );
}
