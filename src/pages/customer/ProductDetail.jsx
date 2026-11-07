import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { availabilityText } from '../../components/ProductCard.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);

  useEffect(() => { api.get(`/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message)); }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Loading…</p>;

  async function handleAdd() {
    if (!user) return navigate('/login');
    try {
      await add(product.id, qty);
      setMsg({ ok: true, text: 'Added to cart' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  return (
    <div className="card narrow">
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p><b>₹{product.price}</b> <span className={`badge ${product.availability}`}>{availabilityText[product.availability]}</span></p>
      {user?.role !== 'admin' && (
        <div className="row">
          <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" style={{ maxWidth: 90 }} />
          <button className="primary" disabled={product.availability === 'out_of_stock'} onClick={handleAdd}>Add to Cart</button>
        </div>
      )}
      {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}
    </div>
  );
}
