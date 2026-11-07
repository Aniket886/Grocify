import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function ManagePayments() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/admin/payments').then((d) => setPayments(d.payments)).catch((e) => setError(e.message)); }, []);

  if (!payments) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <h2>Payments</h2>
      <table>
        <thead><tr><th>Time</th><th>Order</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Transaction</th></tr></thead>
        <tbody>
          {payments.length === 0 && <tr><td colSpan="7">No payments yet.</td></tr>}
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.createdAt).toLocaleString()}</td><td>{p.orderId}</td><td>{p.customer}</td><td>{p.method}</td><td>₹{p.amount}</td>
              <td><span className={`badge ${p.status === 'failed' ? 'out_of_stock' : ''}`}>{p.status}</span>{p.failureReason && <div className="muted">{p.failureReason}</div>}</td>
              <td>{p.transactionId}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Only the payment method, status and transaction ID are stored. Card, UPI and bank details never reach Grocify.</p>
    </>
  );
}
