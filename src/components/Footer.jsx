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
            </div>
          </div>

          {/* Grouped Links: Collections & Customer Care */}
          <div className="footer-links-row">
            {/* Shop Collections */}
            <div className="footer-col footer-col-links">
              <h4 className="footer-heading">Collections</h4>
              <ul className="footer-links">
                <li><Link to="/products">All Products</Link></li>
                <li><Link to="/s/artisanal">Artisanal &amp; Gourmet</Link></li>
                <li><Link to="/s/grocery-kitchen">Grocery &amp; Kitchen</Link></li>
                <li><Link to="/s/gifting">Curated Gifting</Link></li>
                <li><Link to="/categories">All Categories</Link></li>
              </ul>
            </div>

            {/* Customer Care */}
            <div className="footer-col footer-col-links">
              <h4 className="footer-heading">Customer Care</h4>
              <ul className="footer-links">
                <li><Link to="/orders">My Orders &amp; Receipts</Link></li>
                <li><Link to="/cart">Shopping Basket</Link></li>
                <li><Link to="/notifications">Order Notifications</Link></li>
                <li><Link to="/profile">Profile &amp; Dashboard</Link></li>
              </ul>
            </div>
          </div>

          {/* Trust & Security */}
          <div className="footer-col trust-col">
            <h4 className="footer-heading">Trust &amp; Security</h4>
            <div className="footer-trust-grid">
              <div className="footer-trust-item">
                <span className="trust-icon" aria-hidden="true">🔒</span>
                <span className="trust-text">256-Bit Encrypted Payments</span>
              </div>
              <div className="footer-trust-item">
                <span className="trust-icon" aria-hidden="true">🌿</span>
                <span className="trust-text">100% Quality Guarantee</span>
              </div>
              <div className="footer-trust-item">
                <span className="trust-icon" aria-hidden="true">⚡</span>
                <span className="trust-text">Fresh Express Packing</span>
              </div>
              <div className="footer-trust-item">
                <span className="trust-icon" aria-hidden="true">🎓</span>
                <span className="trust-text">GM University · UC25CA2303</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Made with ❤️ Harshita */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Grocify v{__APP_VERSION__}. All rights reserved.
          </p>
          <div className="footer-right-credit">
            <div className="footer-credit">
              Made with <span className="heart-icon" aria-label="love">❤️</span> Harshita
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
