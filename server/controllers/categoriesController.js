import * as store from '../data/localStore.js';
import { badRequest, text } from '../middleware/validate.js';

export async function list(req, res) {
  res.json({ categories: await store.listCategories() });
}

export async function create(req, res) {
  const name = text(req.body.name, 'Category name', { max: 60 });
  const existing = (await store.listCategories()).find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) throw badRequest('Category already exists', 409);
  const category = await store.createCategory(name);
  req.log.info('Category created', { adminId: req.user.id, categoryId: category.id });
  res.status(201).json({ category });
}

export async function update(req, res) {
  const name = text(req.body.name, 'Category name', { max: 60 });
  const category = await store.updateCategory(req.params.id, name);
  if (!category) throw badRequest('Category not found', 404);
  req.log.info('Category updated', { adminId: req.user.id, categoryId: category.id });
  res.json({ category });
}

export async function remove(req, res) {
  if (!(await store.getCategory(req.params.id))) throw badRequest('Category not found', 404);
  if (await store.categoryHasProducts(req.params.id)) throw badRequest('Move or delete this category\'s products first', 409);
  await store.deleteCategory(req.params.id);
  req.log.info('Category deleted', { adminId: req.user.id, categoryId: req.params.id });
  res.status(204).end();
}
