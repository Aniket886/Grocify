import * as store from '../data/localStore.js';
import { present } from './productsController.js';
import { badRequest, number } from '../middleware/validate.js';

// Admin stock view. ?lowOnly=true shows only products at or below their low-stock limit.
export async function list(req, res) {
  const products = await store.listInventory({ lowOnly: req.query.lowOnly === 'true' });
  const categories = await store.listCategories();
  const name = (id) => categories.find((c) => c.id === id)?.name || '—';
  res.json({
    products: products.map((p) => ({ ...present(p), categoryName: name(p.categoryId), isLowStock: p.stock <= p.lowStockLimit })),
  });
}

// Quick restock / stock adjustment endpoint for admin inventory management
export async function updateStock(req, res) {
  const p = await store.getProduct(req.params.id);
  if (!p) throw badRequest('Product not found', 404);

  const patch = {};
  if (req.body.stock !== undefined) {
    patch.stock = number(req.body.stock, 'Stock', { min: 0, integer: true });
  } else if (req.body.stockDelta !== undefined) {
    const delta = number(req.body.stockDelta, 'Stock delta', { integer: true });
    patch.stock = Math.max(0, p.stock + delta);
  }

  if (req.body.lowStockLimit !== undefined) {
    patch.lowStockLimit = number(req.body.lowStockLimit, 'Low-stock limit', { min: 0, integer: true });
  }

  const updated = await store.updateProduct(p.id, patch);
  const categories = await store.listCategories();
  const catName = categories.find((c) => c.id === updated.categoryId)?.name || '—';

  req.log.info('Inventory stock adjusted', { adminId: req.user.id, productId: updated.id, newStock: updated.stock });
  res.json({
    product: {
      ...present(updated),
      categoryName: catName,
      isLowStock: updated.stock <= updated.lowStockLimit,
    },
  });
}
