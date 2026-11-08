import { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api.js';

// Curated photo presets for 1-click photo replacement using real high-definition photography
const PHOTO_PRESETS = [
  { label: 'Desi Ghee', url: 'https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=600&q=80' },
  { label: 'Forest Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80' },
  { label: 'Arabica Coffee', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mustard Oil', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Dark Chocolate', url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Royal Saffron', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Pink Salt', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80' },
  { label: 'Organic Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Fresh Mangoes', url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80' },
  { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Gift Hamper', url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80' },
];

const UNIT_CHIPS = ['1 kg', '500 g', '250 g', '1 L', '500 ml', '1 Dozen', 'Pack of 2', 'Pack of 4'];
const BADGE_CHIPS = ['100% Organic', 'Artisanal', 'Bestseller', 'Royal Grade-1', 'Cold-Pressed', 'Single-Origin', '360° Inspection', 'Curated Gifting', 'Farm Fresh', 'Non-GMO'];

const initialForm = {
  name: '',
  categoryId: '',
  price: '',
  originalPrice: '',
  discountPercentage: '',
  stock: '',
  lowStockLimit: '10',
  unit: '',
  badge: '',
  origin: '',
  description: '',
  image: '',
  isActive: true,
  featured: false,
};

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products?includeInactive=true'),
        api.get('/categories')
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  // Handle Form field changes with live discount synchronizer
  const handleFieldChange = (key, val) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };

      // Live Discount % calculator
      if (key === 'price' || key === 'originalPrice') {
        const p = parseFloat(key === 'price' ? val : prev.price);
        const op = parseFloat(key === 'originalPrice' ? val : prev.originalPrice);
        if (!isNaN(p) && !isNaN(op) && op > p && op > 0) {
          updated.discountPercentage = Math.round(((op - p) / op) * 100).toString();
        } else if (isNaN(op) || op <= p) {
          updated.discountPercentage = '';
        }
      } else if (key === 'discountPercentage') {
        const disc = parseFloat(val);
        const p = parseFloat(prev.price);
        if (!isNaN(disc) && disc > 0 && disc < 100 && !isNaN(p) && p > 0) {
          updated.originalPrice = (p / (1 - disc / 100)).toFixed(2);
        }
      }

      return updated;
    });
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...initialForm, categoryId: categories[0]?.id || '' });
    setIsFormOpen(true);
    setError('');
    setSuccessMsg('');
  };

  const openEditForm = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      categoryId: p.categoryId || '',
      price: p.price !== undefined ? p.price.toString() : '',
      originalPrice: p.originalPrice !== undefined ? p.originalPrice.toString() : '',
      discountPercentage: p.discountPercentage !== undefined ? p.discountPercentage.toString() : '',
      stock: p.stock !== undefined ? p.stock.toString() : '0',
      lowStockLimit: p.lowStockLimit !== undefined ? p.lowStockLimit.toString() : '10',
      unit: p.unit || '',
      badge: p.badge || '',
      origin: p.origin || '',
      description: p.description || '',
      image: p.image || '',
      isActive: p.isActive !== false,
      featured: Boolean(p.featured),
    });
    setIsFormOpen(true);
    setError('');
    setSuccessMsg('');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        discountPercentage: form.discountPercentage ? parseInt(form.discountPercentage, 10) : undefined,
        stock: parseInt(form.stock, 10) || 0,
        lowStockLimit: form.lowStockLimit ? parseInt(form.lowStockLimit, 10) : 10,
        unit: form.unit.trim(),
        badge: form.badge.trim(),
        origin: form.origin.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        isActive: form.isActive,
        featured: form.featured,
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setSuccessMsg(`Product "${form.name}" updated successfully!`);
      } else {
        await api.post('/products', payload);
        setSuccessMsg(`New product "${form.name}" created successfully!`);
      }

      await loadData();
      closeForm();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/products/${deleteTarget.id}`);
      setSuccessMsg(`Product "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    }
  };

  const toggleProductActive = async (p) => {
    try {
      await api.put(`/products/${p.id}`, {
        ...p,
        isActive: !p.isActive,
      });
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to toggle product status');
    }
  };

  // Filtered Products computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesOrigin = (p.origin || '').toLowerCase().includes(q);
        const matchesCat = catName(p.categoryId).toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesOrigin && !matchesCat) return false;
      }
      // Category Filter
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      // Stock Filter
      if (stockFilter === 'out_of_stock' && p.stock > 0) return false;
      if (stockFilter === 'low_stock' && (p.stock <= 0 || p.stock > (p.lowStockLimit || 10))) return false;
      if (stockFilter === 'in_stock' && p.stock <= (p.lowStockLimit || 10)) return false;
      // Active Status Filter
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;

      return true;
    });
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter]);

  // Metric aggregates
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive).length;
    const lowStock = products.filter((p) => p.isActive && p.stock <= (p.lowStockLimit || 10) && p.stock > 0).length;
    const outOfStock = products.filter((p) => p.isActive && p.stock <= 0).length;
    const withDiscount = products.filter((p) => p.originalPrice && p.originalPrice > p.price).length;
    return { total, active, lowStock, outOfStock, withDiscount };
  }, [products]);

  return (
    <div className="admin-manage-products-page">
      {/* Page Header */}
      <div className="admin-header-row">
        <div>
          <h2>Product Catalog Manager</h2>
          <p className="muted">Control titles, pricing, discounts, stock, photo assets, units, badges, and metadata.</p>
        </div>
        <button type="button" className="primary btn-add-product" onClick={openAddForm}>
          <span>+ Add New Product</span>
        </button>
      </div>

      {/* KPI Metric Overview Bar */}
      <div className="admin-metrics-row">
        <div className="metric-pill-card">
          <span className="metric-label">Total SKUs</span>
          <span className="metric-val">{stats.total}</span>
        </div>
        <div className="metric-pill-card">
          <span className="metric-label">Active on Store</span>
          <span className="metric-val text-emerald">{stats.active}</span>
        </div>
        <div className="metric-pill-card">
          <span className="metric-label">On Sale / Discount</span>
          <span className="metric-val text-rose">{stats.withDiscount}</span>
        </div>
        <div className="metric-pill-card">
          <span className="metric-label">Low Stock</span>
          <span className="metric-val text-amber">{stats.lowStock}</span>
        </div>
        <div className="metric-pill-card">
          <span className="metric-label">Out of Stock</span>
          <span className="metric-val text-danger">{stats.outOfStock}</span>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <div className="alert-box error" role="alert">{error}</div>}
      {successMsg && <div className="alert-box success" role="status">{successMsg}</div>}

      {/* Create / Edit Form Modal / Collapsible Drawer */}
      {isFormOpen && (
        <div className="product-form-modal-card card">
          <div className="form-card-header">
            <h3>{editingId ? 'Edit Product Details' : 'Create New E-Commerce Product'}</h3>
            <button type="button" className="close-form-btn" onClick={closeForm} aria-label="Close">✕</button>
          </div>

          <form onSubmit={handleSave} className="admin-product-form">
            <div className="form-section-title">1. Basic Information &amp; Taxonomy</div>
            <div className="form-grid-two">
              <div>
                <label htmlFor="prodName">Product Title *</label>
                <input
                  id="prodName"
                  required
                  placeholder="e.g. A2 Cultured Desi Cow Ghee"
                  value={form.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="prodCat">Category *</label>
                <select
                  id="prodCat"
                  required
                  value={form.categoryId}
                  onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-two">
              <div>
                <label htmlFor="prodUnit">Unit / Packaging (e.g. 500 g, 1 L, Pack of 2)</label>
                <input
                  id="prodUnit"
                  placeholder="e.g. 500 ml Glass Jar"
                  value={form.unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                />
                <div className="quick-chip-row">
                  {UNIT_CHIPS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`quick-chip ${form.unit === u ? 'active' : ''}`}
                      onClick={() => handleFieldChange('unit', u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="prodOrigin">Origin / Regional Sourcing</label>
                <input
                  id="prodOrigin"
                  placeholder="e.g. Gir Sanctuary, Gujarat / Coorg Hills"
                  value={form.origin}
                  onChange={(e) => handleFieldChange('origin', e.target.value)}
                />
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: 20 }}>2. Pricing, Discount &amp; Inventory Controls</div>
            <div className="form-grid-four">
              <div>
                <label htmlFor="prodPrice">Selling Price (₹) *</label>
                <input
                  id="prodPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="₹ 649"
                  value={form.price}
                  onChange={(e) => handleFieldChange('price', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="prodOrigPrice">Original MRP / Compare (₹)</label>
                <input
                  id="prodOrigPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 750"
                  value={form.originalPrice}
                  onChange={(e) => handleFieldChange('originalPrice', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="prodDiscount">Discount %</label>
                <input
                  id="prodDiscount"
                  type="number"
                  min="0"
                  max="99"
                  placeholder="15%"
                  value={form.discountPercentage}
                  onChange={(e) => handleFieldChange('discountPercentage', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="prodStock">Current Stock *</label>
                <input
                  id="prodStock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="25"
                  value={form.stock}
                  onChange={(e) => handleFieldChange('stock', e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-two">
              <div>
                <label htmlFor="prodLowStock">Low Stock Alert Limit</label>
                <input
                  id="prodLowStock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="10"
                  value={form.lowStockLimit}
                  onChange={(e) => handleFieldChange('lowStockLimit', e.target.value)}
                />
                <span className="input-helper">Triggers low-stock warning banners in admin when stock reaches this value.</span>
              </div>
              <div>
                <label htmlFor="prodBadge">Promotional Badge Tag</label>
                <input
                  id="prodBadge"
                  placeholder="e.g. 100% Organic"
                  value={form.badge}
                  onChange={(e) => handleFieldChange('badge', e.target.value)}
                />
                <div className="quick-chip-row">
                  {BADGE_CHIPS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`quick-chip ${form.badge === b ? 'active' : ''}`}
                      onClick={() => handleFieldChange('badge', b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: 20 }}>3. Product Photo &amp; Media Asset</div>
            <div className="photo-manager-layout">
              <div className="photo-preview-pane">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="Product preview"
                    className="photo-preview-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="photo-placeholder-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="photo-placeholder-icon">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span>No image set</span>
                  </div>
                )}
              </div>
              <div className="photo-inputs-pane">
                <label htmlFor="prodImg">Image URL / Data URI</label>
                <input
                  id="prodImg"
                  placeholder="https://... or data:image/svg+xml;... or /images/..."
                  value={form.image}
                  onChange={(e) => handleFieldChange('image', e.target.value)}
                />
                <div className="photo-presets-block">
                  <span className="preset-label">One-Click Photo Presets:</span>
                  <div className="preset-buttons-row">
                    {PHOTO_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="preset-btn"
                        onClick={() => handleFieldChange('image', p.url)}
                        title={`Apply ${p.label} Photo`}
                      >
                        <img src={p.url} alt={p.label} className="preset-mini-thumb" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                    {form.image && (
                      <button
                        type="button"
                        className="preset-btn text-danger"
                        onClick={() => handleFieldChange('image', '')}
                      >
                        Clear Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: 20 }}>4. Description &amp; Visibility</div>
            <div>
              <label htmlFor="prodDesc">Product Description</label>
              <textarea
                id="prodDesc"
                rows="3"
                placeholder="Highlight source purity, aroma, certifications, and culinary benefits..."
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>

            <div className="form-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                />
                <span>Active on Storefront (Customers can browse and buy)</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => handleFieldChange('featured', e.target.checked)}
                />
                <span>Featured Pick (Showcase in highlighted collections)</span>
              </label>
            </div>

            <div className="form-actions-bar">
              <button type="submit" className="primary btn-save" disabled={isSaving}>
                {isSaving ? 'Saving Product...' : editingId ? 'Update Product' : 'Create Product'}
              </button>
              <button type="button" className="secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="admin-filters-card card">
        <div className="search-filter-grid">
          <div className="search-box-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, description, or origin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            aria-label="Filter by Stock Status"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (Healthy)</option>
            <option value="low_stock">Low Stock Alerts</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Visibility"
          >
            <option value="all">All Visibility</option>
            <option value="active">Active Only</option>
            <option value="inactive">Hidden / Inactive</option>
          </select>
        </div>
        <div className="filters-result-summary">
          <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span>
          {(searchQuery || categoryFilter || stockFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setStockFilter('all');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Products Table */}
      <div className="table-responsive-card card">
        <table className="admin-products-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Photo</th>
              <th>Product Details</th>
              <th>Category</th>
              <th>Pricing &amp; Discount</th>
              <th>Stock Status</th>
              <th>Visibility</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  <div className="empty-state-box">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="empty-icon" aria-hidden="true">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                    <p>No products match the selected criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isLow = p.stock > 0 && p.stock <= (p.lowStockLimit || 10);
                const isOut = p.stock <= 0;
                return (
                  <tr key={p.id} className={!p.isActive ? 'row-inactive' : ''}>
                    {/* Thumbnail */}
                    <td className="cell-thumb">
                      <div className="table-thumb-wrap">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <span className="table-thumb-placeholder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                              <path d="M3 6h18" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="cell-details">
                      <div className="product-title-line">
                        <strong className="product-name-text">{p.name}</strong>
                        {p.unit && <span className="product-unit-pill">{p.unit}</span>}
                      </div>
                      <div className="product-meta-row">
                        {p.badge && <span className="product-badge-tag">{p.badge}</span>}
                        {p.origin && <span className="product-origin-tag">{p.origin}</span>}
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="cat-pill">{catName(p.categoryId)}</span>
                    </td>

                    {/* Pricing */}
                    <td>
                      <div className="price-stack">
                        <span className="current-price-text">₹{Number(p.price).toFixed(2)}</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="original-mrp-strike">₹{Number(p.originalPrice).toFixed(2)}</span>
                        )}
                        {p.discountPercentage > 0 && (
                          <span className="discount-pill-green">{p.discountPercentage}% OFF</span>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td>
                      <div className="stock-cell-wrap">
                        <span className="stock-number">{p.stock} units</span>
                        <span className={`badge ${p.availability}`}>
                          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-pill ${p.isActive ? 'active' : 'inactive'}`}
                        onClick={() => toggleProductActive(p)}
                        title="Click to toggle visibility"
                      >
                        {p.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="secondary btn-edit-sm"
                          onClick={() => openEditForm(p)}
                          title="Edit Product"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger btn-del-sm"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete Product"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Product Deletion</h3>
            <p>
              Are you sure you want to delete <strong>&quot;{deleteTarget.name}&quot;</strong>?
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              This will safely remove the item from the customer storefront while preserving past order records.
            </p>
            <div className="modal-actions-row">
              <button type="button" className="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmDelete}>
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
