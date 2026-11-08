import env from '../config/env.js';
import * as store from '../data/localStore.js';
import { badRequest, text, number } from '../middleware/validate.js';

// Adds availability info and commercial display attributes the customer sees
export function present(p) {
  const lowLimit = p.lowStockLimit !== undefined && p.lowStockLimit !== null ? p.lowStockLimit : env.lowStockDefault;
  const availability = p.stock <= 0 ? 'out_of_stock' : p.stock <= lowLimit ? 'low_stock' : 'in_stock';
  const price = Number(p.price) || 0;
  const originalPrice = p.originalPrice !== undefined && p.originalPrice !== null && p.originalPrice !== '' ? Number(p.originalPrice) : undefined;
  let discountPercentage = p.discountPercentage !== undefined && p.discountPercentage !== null && p.discountPercentage !== '' ? Number(p.discountPercentage) : undefined;

  if (originalPrice && originalPrice > price && !discountPercentage) {
    discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    ...p,
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
    discountPercentage: discountPercentage && discountPercentage > 0 ? discountPercentage : undefined,
    availability,
    unit: p.unit || '',
    badge: p.badge || '',
    origin: p.origin || '',
    image: p.image || '',
    isActive: p.isActive !== false,
    featured: Boolean(p.featured),
  };
}

async function readBody(body) {
  const categoryId = text(body.categoryId, 'Category', { max: 100 });
  if (!(await store.getCategory(categoryId))) throw badRequest('Category not found');

  const price = number(body.price, 'Price', { min: 0 });
  let originalPrice =
    body.originalPrice !== undefined && body.originalPrice !== '' && body.originalPrice !== null
      ? number(body.originalPrice, 'Original price (MRP)', { min: 0 })
      : undefined;

  let discountPercentage =
    body.discountPercentage !== undefined && body.discountPercentage !== '' && body.discountPercentage !== null
      ? number(body.discountPercentage, 'Discount percentage', { min: 0, max: 100 })
      : undefined;

  // Auto-calculate discount percentage if original price is higher than selling price
  if (originalPrice && originalPrice > price && discountPercentage === undefined) {
    discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    name: text(body.name, 'Name', { max: 150 }),
    description: text(body.description, 'Description', { optional: true, max: 1000 }),
    categoryId,
    price,
    originalPrice,
    discountPercentage,
    stock: number(body.stock, 'Stock', { min: 0, integer: true }),
    lowStockLimit:
      body.lowStockLimit === undefined || body.lowStockLimit === ''
        ? env.lowStockDefault
        : number(body.lowStockLimit, 'Low-stock limit', { min: 0, integer: true }),
    image: text(body.image, 'Image', { optional: true, max: 2000 }),
    unit: text(body.unit, 'Unit / Pack size', { optional: true, max: 60 }),
    badge: text(body.badge, 'Highlight badge', { optional: true, max: 60 }),
    origin: text(body.origin, 'Origin / Region', { optional: true, max: 120 }),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    featured: Boolean(body.featured),
  };
}

export async function list(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';
  const products = await store.listProducts({ categoryId: req.query.category, q: req.query.q, includeInactive });
  res.json({ products: products.map(present) });
}

export async function getOne(req, res) {
  const p = await store.getProduct(req.params.id);
  if (!p || (!p.isActive && req.user?.role !== 'admin')) throw badRequest('Product not found', 404);
  res.json({ product: present(p) });
}

export async function create(req, res) {
  const product = await store.createProduct(await readBody(req.body));
  req.log.info('Product created', { adminId: req.user.id, productId: product.id });
  res.status(201).json({ product: present(product) });
}

export async function update(req, res) {
  if (!(await store.getProduct(req.params.id))) throw badRequest('Product not found', 404);
  const product = await store.updateProduct(req.params.id, await readBody(req.body));
  req.log.info('Product updated', { adminId: req.user.id, productId: product.id });
  res.json({ product: present(product) });
}

export async function remove(req, res) {
  if (!(await store.getProduct(req.params.id))) throw badRequest('Product not found', 404);
  await store.deleteProduct(req.params.id);
  req.log.info('Product deleted', { adminId: req.user.id, productId: req.params.id });
  res.status(204).end();
}
