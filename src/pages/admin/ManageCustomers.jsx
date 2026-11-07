import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function ManageCustomers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/admin/customers').then((d) => setCustomers(d.customers)).catch((e) => setError(e.message)); }, []);

  if (!customers) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <h2>Customers</h2>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Orders</th><th>Total spent</th><th>Joined</th></tr></thead>
        <tbody>
          {customers.length === 0 && <tr><td colSpan="7">No customers yet.</td></tr>}
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td><td>{c.email}</td><td>{c.phone || '—'}</td>
              <td>{c.address?.line ? `${c.address.line}, ${c.address.city} ${c.address.pincode}` : '—'}</td>
              <td>{c.orderCount}</td><td>₹{c.totalSpent}</td><td>{new Date(c.joinedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
