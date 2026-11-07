import * as store from '../data/localStore.js';
import { present } from './productsController.js';

// Admin stock view. ?lowOnly=true shows only products at or below their low-stock limit.
export async function list(req, res) {
  const products = await store.listInventory({ lowOnly: req.query.lowOnly === 'true' });
  const categories = await store.listCategories();
  const name = (id) => categories.find((c) => c.id === id)?.name || '—';
  res.json({
    products: products.map((p) => ({ ...present(p), categoryName: name(p.categoryId), isLowStock: p.stock <= p.lowStockLimit })),
  });
}
