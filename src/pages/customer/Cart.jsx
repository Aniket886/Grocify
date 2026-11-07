import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';

export default function Cart() {
  const { cart, setQuantity, remove } = useCart();
  const [error, setError] = useState('');

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
  };

  if (cart.lines.length === 0) {
    return <><h2>Your cart</h2><p>Your cart is empty.</p><Link to="/products">Browse products</Link></>;
  }

  return (
    <>
      <h2>Your cart</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead>
        <tbody>
          {cart.lines.map((l) => (
            <tr key={l.product.id}>
              <td>{l.product.name}</td>
              <td>₹{l.product.price}</td>
              <td>
                <button className="secondary" aria-label={`Decrease ${l.product.name}`} onClick={() => run(() => setQuantity(l.product.id, l.quantity - 1))}>−</button>
                {' '}{l.quantity}{' '}
                <button className="secondary" aria-label={`Increase ${l.product.name}`} onClick={() => run(() => setQuantity(l.product.id, l.quantity + 1))}>+</button>
              </td>
              <td>₹{l.subtotal}</td>
              <td><button className="danger" onClick={() => run(() => remove(l.product.id))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Total: ₹{cart.total}</h3>
      <Link to="/checkout"><button className="primary">Checkout</button></Link>
    </>
  );
}
