import * as store from '../data/localStore.js';
import { badRequest, number } from '../middleware/validate.js';
import { present } from './productsController.js';

// Builds the cart the customer sees. The total is always calculated on the server from current prices.
async function buildCart(userId) {
  const raw = await store.getCart(userId);
  const lines = [];
  for (const [productId, quantity] of Object.entries(raw)) {
    const p = await store.getProduct(productId);
    if (!p || !p.isActive) {
      await store.removeCartItem(userId, productId); // product was deleted; drop it quietly
      continue;
    }
    lines.push({ product: present(p), quantity, subtotal: Math.round(p.price * quantity * 100) / 100 });
  }
  const total = Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;
  return { lines, total };
}

async function checkedProduct(productId, quantity) {
  const p = await store.getProduct(productId);
  if (!p || !p.isActive) throw badRequest('Product not found', 404);
  if (p.stock <= 0) throw badRequest(`${p.name} is out of stock`, 409);
  if (quantity > p.stock) throw badRequest(`Only ${p.stock} of ${p.name} available`, 409);
  return p;
}

export async function get(req, res) {
  res.json(await buildCart(req.user.id));
}

// Adds to the current quantity.
export async function add(req, res) {
  const quantity = number(req.body.quantity ?? 1, 'Quantity', { min: 1, integer: true });
  const current = (await store.getCart(req.user.id))[req.body.productId] || 0;
  await checkedProduct(req.body.productId, current + quantity);
  await store.setCartItem(req.user.id, req.body.productId, current + quantity);
  res.status(201).json(await buildCart(req.user.id));
}

// Sets an exact quantity (0 removes the item).
export async function setQuantity(req, res) {
  const quantity = number(req.body.quantity, 'Quantity', { min: 0, integer: true });
  if (quantity === 0) {
    await store.removeCartItem(req.user.id, req.params.productId);
  } else {
    await checkedProduct(req.params.productId, quantity);
    await store.setCartItem(req.user.id, req.params.productId, quantity);
  }
  res.json(await buildCart(req.user.id));
}

export async function remove(req, res) {
  await store.removeCartItem(req.user.id, req.params.productId);
  res.json(await buildCart(req.user.id));
}
