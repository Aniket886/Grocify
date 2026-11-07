import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { api } from '../../services/api.js';

export default function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: {
      line: user?.address?.line || '',
      city: user?.address?.city || '',
      pincode: user?.address?.pincode || '',
    },
  });

  const [msg, setMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch order summary for dashboard stats
  useEffect(() => {
    api.get('/orders')
      .then((d) => setOrderCount((d.orders || []).length))
      .catch(() => {});
  }, []);

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setAddr = (k) => (e) => setForm({ ...form, address: { ...form.address, [k]: e.target.value } });

  async function submit(e) {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProfile(form);
      setMsg({ ok: true, text: 'Profile & delivery details updated successfully' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      await deleteAccount('DELETE');
      alert('Your account has been permanently deleted. Please register again if you wish to shop with us.');
      navigate('/register');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  }

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="profile-dashboard-wrap">
      {/* 1. Header Hero Card */}
      <div className="card profile-header-card">
        <div className="profile-avatar-large">{initials}</div>
        <div className="profile-meta">
          <div className="profile-name-row">
            <h2>{user.name}</h2>
            <span className="role-pill-badge">{user.role === 'admin' ? 'Administrator' : 'Verified Customer'}</span>
          </div>
          <p className="profile-email-text">{user.email}</p>
          <div className="profile-badges-row">
            <span className="info-chip">ID: {user.id.slice(0, 10)}</span>
            <span className="info-chip">Customer Code: #{user.customerCode || 'GC-2026'}</span>
          </div>
        </div>
      </div>

      {/* 2. E-Commerce Dashboard Quick-Stats */}
      <div className="profile-stats-grid">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">📦</span>
          <div>
            <div className="stat-number">{orderCount}</div>
            <div className="stat-label">Total Orders Placed</div>
          </div>
          <Link to="/orders" className="stat-link">View Orders →</Link>
        </div>

        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">🛒</span>
          <div>
            <div className="stat-number">{cartCount}</div>
            <div className="stat-label">Items in Basket</div>
          </div>
          <Link to="/cart" className="stat-link">View Cart →</Link>
        </div>

        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">📍</span>
          <div>
            <div className="stat-number">{user.address?.city || 'Not set'}</div>
            <div className="stat-label">Delivery Hub</div>
          </div>
          <span className="stat-link">PIN: {user.address?.pincode || '—'}</span>
        </div>
      </div>

      {/* 3. Main Details Form Card */}
      <form className="card profile-form-card" onSubmit={submit}>
        <h3>Personal Information</h3>
        <p className="muted">Manage your contact details and default delivery address.</p>

        <div className="form-grid-two">
          <div>
            <label htmlFor="name">Full Name</label>
            <input id="name" required value={form.name} onChange={setField('name')} />
          </div>

          <div>
            <label htmlFor="email">Email Address</label>
            <input id="email" disabled value={user.email} title="Email cannot be modified directly" />
            <span className="input-helper">Contact support to change your login email.</span>
          </div>
        </div>

        <div className="form-grid-two">
          <div>
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" placeholder="+91 98765 43210" value={form.phone} onChange={setField('phone')} />
          </div>

          <div>
            <label htmlFor="country">Region / Country</label>
            <input id="country" disabled value="India" />
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Default Delivery Address</h3>
        <p className="muted">Used for automatic 12-minute express checkout.</p>

        <label htmlFor="line">Street Address / House No.</label>
        <input id="line" placeholder="e.g. #42, Green Avenue, Indiranagar" value={form.address.line} onChange={setAddr('line')} />

        <div className="form-grid-two">
          <div>
            <label htmlFor="city">City</label>
            <input id="city" placeholder="Bengaluru" value={form.address.city} onChange={setAddr('city')} />
          </div>
          <div>
            <label htmlFor="pincode">Postal PIN Code</label>
            <input id="pincode" placeholder="560038" value={form.address.pincode} onChange={setAddr('pincode')} />
          </div>
        </div>

        {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}

        <div className="row" style={{ marginTop: 20 }}>
          <button type="submit" className="primary" disabled={isSaving}>
            {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </div>
      </form>

      {/* 4. Danger Zone: Permanent Account Deletion */}
      <div className="card danger-zone-card">
        <div className="danger-zone-content">
          <div>
            <h3 className="danger-zone-title">⚠️ Delete Account Permanently</h3>
            <p className="danger-zone-desc">
              Permanently delete your account, addresses, and active carts from Grocify.
              This action is completely irreversible. You will need to create a new account to sign in again.
            </p>
          </div>
          <button
            type="button"
            className="danger-btn-pill"
            onClick={() => {
              setConfirmInput('');
              setDeleteError('');
              setShowDeleteModal(true);
            }}
          >
            Delete My Account
          </button>
        </div>
      </div>

      {/* 5. Permanent Deletion Modal Pop-up */}
      {showDeleteModal && (
        <div className="modal-backdrop-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="modal-popover-box">
            <div className="modal-danger-header">
              <span className="modal-alert-icon" aria-hidden="true">⚠️</span>
              <h3 id="delete-dialog-title">Delete Account Permanently?</h3>
            </div>

            <p className="modal-warning-text">
              You are about to permanently delete your account (<strong>{user.email}</strong>).
              All your profile data, active basket, and delivery history will be permanently wiped from the database.
              <br /><br />
              <strong>You will not be able to log in again unless you register a new account.</strong>
            </p>

            <form onSubmit={handleDeleteAccount}>
              <label htmlFor="confirm-delete-input" className="modal-confirm-label">
                To confirm, please type <strong>DELETE</strong> in the box below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                className="modal-input-delete"
                placeholder="Type DELETE"
                autoFocus
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
              />

              {deleteError && <p className="error" style={{ margin: '8px 0' }}>{deleteError}</p>}

              <div className="modal-action-row">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="danger-delete-confirm-btn"
                  disabled={confirmInput.trim().toUpperCase() !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? 'Deleting Permanently...' : 'Yes, Delete Permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
