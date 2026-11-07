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

  return (
    <div className="card product-card">
      <Link to={`/products/${product.id}`} className="product-title-link">
        <b>{product.name}</b>
      </Link>
      <p className="muted product-description">{product.description}</p>
      <div className="product-price-row">
        <span className="price-value">₹{Number(product.price).toFixed(2)}</span>
        <span className={`badge ${product.availability}`}>{availabilityText[product.availability]}</span>
      </div>
      {user?.role !== 'admin' && (
        <div className="row" style={{ marginTop: 'auto', paddingTop: 10 }}>
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
  );
}
