import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { availabilityText } from '../../components/ProductCard.jsx';
import ProductViewer360 from '../../components/ProductViewer360.jsx';
import { INTERACTIVE_3D_CATEGORY_SLUGS } from '../../data/categoryTaxonomy.js';

// Keywords in the product name that turn the 360° viewer on. We use these
// alongside the display taxonomy so even today's seeded sample products can
// show the viewer on a phone/headphone/watch demo.
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

  useEffect(() => { api.get(`/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message)); }, [id]);

  const showViewer = useMemo(() => {
    if (!product) return false;
    const low = product.name.toLowerCase();
    return VIEWER_KEYWORDS.some((k) => low.includes(k)) || INTERACTIVE_3D_CATEGORY_SLUGS.has(product.slug);
  }, [product]);

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
    <div className="card" style={{ display: 'grid', gridTemplateColumns: showViewer ? 'minmax(260px, 1fr) minmax(260px, 1fr)' : '1fr', gap: 24 }}>
      {showViewer && (
        <div>
          <ProductViewer360 label={product.name} />
        </div>
      )}
      <div>
        <h2>{product.name}</h2>
        <p className="muted">{product.description}</p>
        <p><b style={{ fontSize: '1.3rem' }}>₹{product.price}</b>  <span className={`badge ${product.availability}`}>{availabilityText[product.availability]}</span></p>
        {user?.role !== 'admin' && (
          <div className="row">
            <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" style={{ maxWidth: 110 }} />
            <button className="primary" disabled={product.availability === 'out_of_stock'} onClick={handleAdd}>Add to Cart</button>
            <button className="ghost" onClick={() => window.print()} aria-label="Print this page">🖨️ Print</button>
          </div>
        )}
        {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}
