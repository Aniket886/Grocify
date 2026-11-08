import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export const availabilityText = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
};

export default function ProductCard({ product, onMessage }) {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleAdd() {
    if (!user) return navigate('/login');
    try {
      setIsAdding(true);
      await add(product.id);
      onMessage?.({ ok: true, text: `${product.name} added to cart` });
    } catch (e) {
      onMessage?.({ ok: false, text: e.message });
    } finally {
      setIsAdding(false);
    }
  }

  const isOutOfStock = product.availability === 'out_of_stock';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="card product-card">
      {/* Product Image Thumbnail */}
      <Link to={`/products/${product.id}`} className="product-card-media-wrap">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className="product-card-image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-card-image-fallback" aria-hidden="true">
            <span>🛍️</span>
          </div>
        )}
        {product.badge && (
          <span className="product-card-floating-badge">{product.badge}</span>
        )}
        {hasDiscount && product.discountPercentage > 0 && (
          <span className="product-card-discount-pill">
            {product.discountPercentage}% OFF
          </span>
        )}
      </Link>

      <div className="product-card-content">
        <div className="product-title-row">
          <Link to={`/products/${product.id}`} className="product-title-link">
            <b>{product.name}</b>
          </Link>
          {product.unit && <span className="product-unit-tag">{product.unit}</span>}
        </div>

        <p className="muted product-description">{product.description}</p>

        <div className="product-price-row">
          <div className="price-stack-horizontal">
            <span className="price-value">₹{Number(product.price).toFixed(2)}</span>
            {hasDiscount && (
              <span className="price-mrp-strike">₹{Number(product.originalPrice).toFixed(2)}</span>
            )}
          </div>
          <span className={`badge ${product.availability}`}>{availabilityText[product.availability]}</span>
        </div>

        {user?.role !== 'admin' && (
          <div className="row product-card-action" style={{ marginTop: 'auto', paddingTop: 10 }}>
            <button
              className="primary"
              disabled={isOutOfStock || isAdding}
              onClick={handleAdd}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdding ? 'Adding...' : isOutOfStock ? 'Out of stock' : 'Add to Cart'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
