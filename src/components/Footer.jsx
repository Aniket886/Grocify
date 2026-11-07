import { Link } from 'react-router-dom';
/* global __APP_VERSION__ */

export default function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="brand-dot" aria-hidden="true">✦</span>
              <span className="brand-title">Grocify</span>
            </div>
            <p className="footer-about">
              Curated artisanal provisions, certified organic pantry staples, and everyday essentials delivered with care and speed.
            </p>
            <div className="footer-pill-badges">
              <span className="footer-badge">Online Grocery System</span>
              <span className="footer-badge version-badge">v{__APP_VERSION__}</span>
              <span className="footer-badge author-badge">Made with ❤️ Harshita</span>
            </div>
          </div>

          {/* Shop */}
          <div className="footer-col">
            <h4 className="footer-heading">Collections</h4>
            <ul className="footer-links">
              <li><Link to="/products">All Products</Link></li>
              <li><Link to="/s/artisanal">Artisanal &amp; Gourmet</Link></li>
              <li><Link to="/s/grocery-kitchen">Grocery &amp; Kitchen</Link></li>
              <li><Link to="/s/gifting">Curated Gifting</Link></li>
              <li><Link to="/categories">All Categories</Link></li>
            </ul>
          </div>

          {/* Customer Support & Account */}
          <div className="footer-col">
            <h4 className="footer-heading">Customer Care</h4>
            <ul className="footer-links">
              <li><Link to="/orders">My Orders &amp; Receipts</Link></li>
              <li><Link to="/cart">Shopping Basket</Link></li>
              <li><Link to="/notifications">Order Notifications</Link></li>
              <li><Link to="/profile">Profile &amp; Delivery Address</Link></li>
              <li><Link to="/settings">Theme &amp; Preferences</Link></li>
            </ul>
          </div>

          {/* Trust & Project Details */}
          <div className="footer-col">
            <h4 className="footer-heading">Trust &amp; Security</h4>
            <ul className="footer-links">
              <li><span className="footer-static-item">🔒 256-Bit Encrypted Payments</span></li>
              <li><span className="footer-static-item">🌿 100% Quality Guarantee</span></li>
              <li><span className="footer-static-item">⚡ Fresh Express Packing</span></li>
              <li><span className="footer-static-item">GM University · UC25CA2303</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} Grocify v{__APP_VERSION__}. All rights reserved.</p>
          <div className="footer-credit">
            Made with <span className="heart-icon" aria-label="love">❤️</span> Harshita
          </div>
          <div className="footer-sub-links">
            <Link to="/settings">Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
