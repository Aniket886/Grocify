import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Create account</h2>
      <label htmlFor="name">Name</label>
      <input id="name" required value={form.name} onChange={set('name')} />
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={form.email} onChange={set('email')} />
      <label htmlFor="phone">Phone (optional)</label>
      <input id="phone" value={form.phone} onChange={set('phone')} />
      <label htmlFor="password">Password (min 8 characters)</label>
      <input id="password" type="password" required minLength={8} value={form.password} onChange={set('password')} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row"><button className="primary" disabled={busy}>Register</button></div>
      <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
    </form>
  );
}
