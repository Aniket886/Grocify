import env from '../config/env.js';
import logger from '../config/logger.js';
import * as store from '../data/localStore.js';
import { badRequest, text, number } from '../middleware/validate.js';

// Adds availability info the customer sees: in stock / low stock / out of stock.
export function present(p) {
  const availability = p.stock <= 0 ? 'out_of_stock' : p.stock <= p.lowStockLimit ? 'low_stock' : 'in_stock';
  return { ...p, availability };
}

async function readBody(body) {
  const categoryId = text(body.categoryId, 'Category', { max: 100 });
  if (!(await store.getCategory(categoryId))) throw badRequest('Category not found');
  return {
    name: text(body.name, 'Name', { max: 100 }),
    description: text(body.description, 'Description', { optional: true, max: 500 }),
    categoryId,
    price: number(body.price, 'Price', { min: 0 }),
    stock: number(body.stock, 'Stock', { min: 0, integer: true }),
    lowStockLimit: body.lowStockLimit === undefined || body.lowStockLimit === '' ? env.lowStockDefault : number(body.lowStockLimit, 'Low-stock limit', { min: 0, integer: true }),
    image: text(body.image, 'Image', { optional: true, max: 300 }),
  };
}

export async function list(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';
  const products = await store.listProducts({ categoryId: req.query.category, q: req.query.q, includeInactive });
  res.json({ products: products.map(present) });
}

export async function getOne(req, res) {
  const p = await store.getProduct(req.params.id);
  if (!p || !p.isActive) throw badRequest('Product not found', 404);
  res.json({ product: present(p) });
}

export async function create(req, res) {
  const product = await store.createProduct(await readBody(req.body));
  logger.info('Product created', { adminId: req.user.id, productId: product.id });
  res.status(201).json({ product: present(product) });
}

export async function update(req, res) {
  if (!(await store.getProduct(req.params.id))) throw badRequest('Product not found', 404);
  const product = await store.updateProduct(req.params.id, await readBody(req.body));
  logger.info('Product updated', { adminId: req.user.id, productId: product.id });
  res.json({ product: present(product) });
}

export async function remove(req, res) {
  if (!(await store.getProduct(req.params.id))) throw badRequest('Product not found', 404);
  await store.deleteProduct(req.params.id);
  logger.info('Product deleted', { adminId: req.user.id, productId: req.params.id });
  res.status(204).end();
}
