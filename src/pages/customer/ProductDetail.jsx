import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { availabilityText } from '../../components/ProductCard.jsx';
import ProductViewer360 from '../../components/ProductViewer360.jsx';
import { INTERACTIVE_3D_CATEGORY_SLUGS } from '../../data/categoryTaxonomy.js';

// Keywords in the product name that turn the 360° viewer on.
const VIEWER_KEYWORDS = ['headphone', 'phone', 'watch', 'speaker', 'camera', 'laptop'];

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((d) => setProduct(d.product))
      .catch((e) => setError(e.message));
  }, [id]);

  const showViewer = useMemo(() => {
    if (!product) return false;
    const low = product.name.toLowerCase();
    return VIEWER_KEYWORDS.some((k) => low.includes(k)) || INTERACTIVE_3D_CATEGORY_SLUGS.has(product.slug);
  }, [product]);

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p className="muted" style={{ padding: 40, textAlign: 'center' }}>Loading product details…</p>;

  async function handleAdd() {
    if (!user) return navigate('/login');
    try {
      await add(product.id, qty);
      setMsg({ ok: true, text: `✓ Added ${qty} item(s) to your basket!` });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  const isOutOfStock = product.availability === 'out_of_stock';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="product-detail-container">
      <div className="product-detail-breadcrumbs">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/products" className="breadcrumb-link">Products</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </div>

      <div className="card product-detail-card">
        {/* Media Column (360 Viewer or Photo) */}
        <div className="product-detail-media-pane">
          {showViewer ? (
            <div className="product-viewer-wrap">
              <ProductViewer360 label={product.name} />
              <div className="viewer-hint-caption">
                <span>🔄 360° Interactive Spatial Inspection</span>
              </div>
            </div>
          ) : (
            <div className="product-photo-wrap">
              {product.image && !imgError ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-detail-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="product-detail-img-fallback">
                  <span style={{ fontSize: 64 }}>🛍️</span>
                  <span className="muted">{product.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="product-detail-info-pane">
          <div className="product-detail-header">
            <div className="badge-cluster">
              {product.badge && <span className="detail-badge-pill">{product.badge}</span>}
              {product.unit && <span className="detail-unit-pill">📦 {product.unit}</span>}
              {product.origin && <span className="detail-origin-pill">📍 {product.origin}</span>}
            </div>
            <h1 className="product-detail-title">{product.name}</h1>
          </div>

          <p className="product-detail-desc">{product.description}</p>

          {/* Pricing Box */}
          <div className="product-detail-pricing-box">
            <div className="pricing-headline">
              <span className="detail-price-current">₹{Number(product.price).toFixed(2)}</span>
              {hasDiscount && (
                <span className="detail-mrp-strike">₹{Number(product.originalPrice).toFixed(2)}</span>
              )}
              {hasDiscount && product.discountPercentage > 0 && (
                <span className="detail-discount-tag">
                  {product.discountPercentage}% OFF
                </span>
              )}
            </div>
            <div className="pricing-subtext">
              <span className={`badge ${product.availability}`}>
                {availabilityText[product.availability]}
              </span>
              {product.stock > 0 && product.stock <= 10 && (
                <span className="stock-hurry-text">Hurry, only {product.stock} units remaining!</span>
              )}
            </div>
          </div>

          {/* Customer Add to Cart */}
          {user?.role !== 'admin' && (
            <div className="product-detail-actions">
              <div className="qty-picker-group">
                <label htmlFor="detail-qty-input" className="qty-label">Quantity:</label>
                <div className="qty-input-controls">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1 || isOutOfStock}
                  >
                    -
                  </button>
                  <input
                    id="detail-qty-input"
                    type="number"
                    min="1"
                    max={product.stock || 99}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    disabled={isOutOfStock}
                    className="qty-number-input"
                  />
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty((q) => q + 1)}
                    disabled={isOutOfStock || (product.stock && qty >= product.stock)}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="primary btn-add-large"
                disabled={isOutOfStock}
                onClick={handleAdd}
              >
                {isOutOfStock ? 'Currently Out of Stock' : 'Add to Basket 🛒'}
              </button>
            </div>
          )}

          {msg && (
            <div className={`detail-alert-box ${msg.ok ? 'success' : 'error'}`} role="status">
              {msg.text}
            </div>
          )}

          {/* Quality & Trust Highlights */}
          <div className="detail-trust-highlights">
            <div className="trust-item">
              <span className="trust-icon">🌱</span>
              <div>
                <strong>Curated Quality</strong>
                <p>Pure ingredients, ethically sourced and verified.</p>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⚡</span>
              <div>
                <strong>Express Safe Packing</strong>
                <p>Temperature-controlled, tamper-evident packaging.</p>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🛡️</span>
              <div>
                <strong>256-Bit Secure Payments</strong>
                <p>Safe digital checkout with instant receipts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
