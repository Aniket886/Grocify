import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    address: { line: user.address?.line || '', city: user.address?.city || '', pincode: user.address?.pincode || '' },
  });
  const [msg, setMsg] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setAddr = (k) => (e) => setForm({ ...form, address: { ...form.address, [k]: e.target.value } });

  async function submit(e) {
    e.preventDefault();
    try {
      await updateProfile(form);
      setMsg({ ok: true, text: 'Profile saved' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>My profile</h2>
      <p className="muted">{user.email}</p>
      <label htmlFor="name">Name</label>
      <input id="name" required value={form.name} onChange={set('name')} />
      <label htmlFor="phone">Phone</label>
      <input id="phone" value={form.phone} onChange={set('phone')} />
      <h3>Delivery address</h3>
      <label htmlFor="line">Address</label>
      <input id="line" value={form.address.line} onChange={setAddr('line')} />
      <label htmlFor="city">City</label>
      <input id="city" value={form.address.city} onChange={setAddr('city')} />
      <label htmlFor="pincode">PIN code</label>
      <input id="pincode" value={form.address.pincode} onChange={setAddr('pincode')} />
      {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}
      <div className="row"><button className="primary">Save</button></div>
    </form>
  );
}
