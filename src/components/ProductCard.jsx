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

  async function handleAdd() {
    if (!user) return navigate('/login');
    try {
      await add(product.id);
      onMessage?.({ ok: true, text: `${product.name} added to cart` });
    } catch (e) {
      onMessage?.({ ok: false, text: e.message });
    }
  }

  return (
    <div className="card">
      <Link to={`/products/${product.id}`}><b>{product.name}</b></Link>
      <p className="muted">{product.description}</p>
      <div>
        ₹{product.price} <span className={`badge ${product.availability}`}>{availabilityText[product.availability]}</span>
      </div>
      {user?.role !== 'admin' && (
        <div className="row">
          <button className="primary" disabled={product.availability === 'out_of_stock'} onClick={handleAdd}>Add to Cart</button>
        </div>
      )}
    </div>
  );
}
