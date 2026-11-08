import { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api.js';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low_stock' | 'out_of_stock' | 'healthy'

  // Editable stock map for custom inputs
  const [customStockInputs, setCustomStockInputs] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const [invRes, catRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/categories')
      ]);
      setProducts(invRes.products || []);
      setCategories(catRes.categories || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3500);
  };

  // Quick Restock via delta or direct set
  const handleStockAdjustment = async (p, delta, exactVal = null) => {
    setUpdatingId(p.id);
    try {
      const payload = exactVal !== null ? { stock: exactVal } : { stockDelta: delta };
      const res = await api.patch(`/inventory/${p.id}`, payload);
      const updatedProduct = res.product;

      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, ...updatedProduct } : item))
      );

      // Clear custom input if used
      setCustomStockInputs((prev) => ({ ...prev, [p.id]: '' }));

      const actionText = exactVal !== null ? `Stock updated to ${exactVal}` : delta > 0 ? `+${delta} units added` : `${delta} units removed`;
      showToast(`✓ ${actionText} for "${p.name}". Current: ${updatedProduct.stock}`);
    } catch (err) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLowLimitUpdate = async (p, newLimit) => {
    const limit = parseInt(newLimit, 10);
    if (isNaN(limit) || limit < 0) return;
    setUpdatingId(p.id);
    try {
      const res = await api.patch(`/inventory/${p.id}`, { lowStockLimit: limit });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, ...res.product } : item))
      );
      showToast(`✓ Low-stock limit set to ${limit} for "${p.name}"`);
    } catch (err) {
      setError(err.message || 'Failed to update threshold');
    } finally {
      setUpdatingId(null);
    }
  };

  // KPI aggregates
  const stats = useMemo(() => {
    const totalSkus = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const totalValuation = products.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockLimit || 10)).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const healthyCount = products.filter((p) => p.stock > (p.lowStockLimit || 10)).length;
    return { totalSkus, totalUnits, totalValuation, lowStockCount, outOfStockCount, healthyCount };
  }, [products]);

  // Filtered Products computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesCat = (p.categoryName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (statusFilter === 'out_of_stock' && p.stock > 0) return false;
      if (statusFilter === 'low_stock' && (p.stock <= 0 || p.stock > (p.lowStockLimit || 10))) return false;
      if (statusFilter === 'healthy' && p.stock <= (p.lowStockLimit || 10)) return false;
      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="admin-inventory-page">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h2>Warehouse Inventory &amp; Stock Operations</h2>
          <p className="muted">Live multi-product inventory monitoring, instant restock actions, and valuation analytics.</p>
        </div>
        <button type="button" className="secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="inventory-stats-grid">
        <div className="inventory-stat-card">
          <span className="stat-card-label">Total SKUs</span>
          <span className="stat-card-val">{stats.totalSkus}</span>
          <span className="stat-card-sub">Active catalogue items</span>
        </div>
        <div className="inventory-stat-card">
          <span className="stat-card-label">Warehouse Stock</span>
          <span className="stat-card-val text-emerald">{stats.totalUnits.toLocaleString()}</span>
          <span className="stat-card-sub">Physical units available</span>
        </div>
        <div className="inventory-stat-card">
          <span className="stat-card-label">Inventory Valuation</span>
          <span className="stat-card-val text-amber">₹{stats.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <span className="stat-card-sub">Stock @ Selling Price</span>
        </div>
        <div className="inventory-stat-card">
          <span className="stat-card-label">Low Stock Alerts</span>
          <span className="stat-card-val text-rose">{stats.lowStockCount}</span>
          <span className="stat-card-sub">At or below reorder limit</span>
        </div>
        <div className="inventory-stat-card">
          <span className="stat-card-label">Depleted / Out</span>
          <span className="stat-card-val text-danger">{stats.outOfStockCount}</span>
          <span className="stat-card-sub">Requires immediate restock</span>
        </div>
      </div>

      {/* Global Alerts & Toast */}
      {error && <div className="alert-box error" role="alert">{error}</div>}
      {toastMsg && <div className="alert-box success toast-fade" role="status">{toastMsg}</div>}

      {/* Filter Tabs & Search Bar */}
      <div className="admin-filters-card card">
        <div className="inventory-filter-tabs">
          <button
            type="button"
            className={`inv-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Items ({stats.totalSkus})
          </button>
          <button
            type="button"
            className={`inv-tab-btn tab-low ${statusFilter === 'low_stock' ? 'active' : ''}`}
            onClick={() => setStatusFilter('low_stock')}
          >
            ⚠️ Low Stock ({stats.lowStockCount})
          </button>
          <button
            type="button"
            className={`inv-tab-btn tab-out ${statusFilter === 'out_of_stock' ? 'active' : ''}`}
            onClick={() => setStatusFilter('out_of_stock')}
          >
            🚫 Out of Stock ({stats.outOfStockCount})
          </button>
          <button
            type="button"
            className={`inv-tab-btn tab-healthy ${statusFilter === 'healthy' ? 'active' : ''}`}
            onClick={() => setStatusFilter('healthy')}
          >
            ✅ Healthy ({stats.healthyCount})
          </button>
        </div>

        <div className="search-filter-grid" style={{ marginTop: 14 }}>
          <div className="search-box-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search product name or SKU..."
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
        </div>
      </div>

      {/* Interactive Inventory Table */}
      <div className="table-responsive-card card">
        <table className="admin-inventory-table">
          <thead>
            <tr>
              <th>Product &amp; Category</th>
              <th>Unit Price</th>
              <th style={{ width: 140 }}>Current Stock</th>
              <th style={{ width: 140 }}>Threshold</th>
              <th style={{ width: 130 }}>Stock Health</th>
              <th>SKU Valuation</th>
              <th style={{ width: 280, textAlign: 'right' }}>Quick Restock Controls</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  <div className="empty-state-box">
                    <span className="empty-icon">📊</span>
                    <p>No inventory records match the selected filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= (p.lowStockLimit || 10);
                const limit = p.lowStockLimit || 10;
                const maxStockDisplay = Math.max(limit * 3, p.stock, 30);
                const percent = Math.min(100, Math.round((p.stock / maxStockDisplay) * 100));
                const skuVal = (Number(p.price) || 0) * (Number(p.stock) || 0);
                const customVal = customStockInputs[p.id] || '';

                return (
                  <tr key={p.id} className={isOut ? 'row-out-stock' : isLow ? 'row-low-stock' : ''}>
                    {/* Name & Category */}
                    <td>
                      <div className="inv-product-col">
                        <strong className="inv-product-title">{p.name}</strong>
                        <div className="inv-cat-row">
                          <span className="cat-pill-sm">{p.categoryName}</span>
                          {p.unit && <span className="unit-pill-sm">{p.unit}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td>
                      <span className="inv-price-text">₹{Number(p.price).toFixed(2)}</span>
                    </td>

                    {/* Current Stock */}
                    <td>
                      <div className="inv-stock-counter">
                        <span className={`stock-huge ${isOut ? 'text-danger' : isLow ? 'text-amber' : 'text-emerald'}`}>
                          {p.stock}
                        </span>
                        <span className="stock-units-label">units</span>
                      </div>
                    </td>

                    {/* Low Stock Limit Threshold */}
                    <td>
                      <div className="threshold-wrap">
                        <input
                          type="number"
                          min="0"
                          defaultValue={p.lowStockLimit || 10}
                          className="threshold-input"
                          onBlur={(e) => handleLowLimitUpdate(p, e.target.value)}
                          title="Click to edit low-stock alert limit"
                        />
                        <span className="muted" style={{ fontSize: 11 }}>limit</span>
                      </div>
                    </td>

                    {/* Stock Health Bar */}
                    <td>
                      <div className="stock-health-container">
                        <div className="stock-health-meter">
                          <div
                            className={`meter-bar ${isOut ? 'bar-out' : isLow ? 'bar-low' : 'bar-healthy'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className={`health-status-badge ${isOut ? 'badge-out' : isLow ? 'badge-low' : 'badge-ok'}`}>
                          {isOut ? 'DEPLETED' : isLow ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </div>
                    </td>

                    {/* SKU Valuation */}
                    <td>
                      <span className="sku-valuation-text">₹{skuVal.toLocaleString('en-IN')}</span>
                    </td>

                    {/* Quick Restock Action Buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="quick-restock-suite">
                        <div className="restock-steppers">
                          <button
                            type="button"
                            className="btn-step step-plus"
                            disabled={updatingId === p.id}
                            onClick={() => handleStockAdjustment(p, 5)}
                            title="Add 5 units"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            className="btn-step step-plus"
                            disabled={updatingId === p.id}
                            onClick={() => handleStockAdjustment(p, 10)}
                            title="Add 10 units"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            className="btn-step step-plus"
                            disabled={updatingId === p.id}
                            onClick={() => handleStockAdjustment(p, 25)}
                            title="Add 25 units"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            className="btn-step step-minus"
                            disabled={updatingId === p.id || p.stock <= 0}
                            onClick={() => handleStockAdjustment(p, -1)}
                            title="Remove 1 unit"
                          >
                            -1
                          </button>
                        </div>

                        {/* Direct input for exact stock */}
                        <div className="exact-stock-box">
                          <input
                            type="number"
                            min="0"
                            placeholder="Set"
                            value={customVal}
                            onChange={(e) =>
                              setCustomStockInputs({ ...customStockInputs, [p.id]: e.target.value })
                            }
                            className="exact-stock-input"
                          />
                          <button
                            type="button"
                            className="btn-set-stock"
                            disabled={updatingId === p.id || customVal === ''}
                            onClick={() => {
                              const val = parseInt(customVal, 10);
                              if (!isNaN(val) && val >= 0) {
                                handleStockAdjustment(p, 0, val);
                              }
                            }}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-footer-note card">
        <span className="note-icon">💡</span>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          <strong>Automated Inventory Synchronization:</strong> Stock levels decrease automatically when customers place orders, and return to warehouse inventory if an unpaid order expires or is cancelled. All stock adjustments take effect immediately across all storefront collections.
        </p>
      </div>
    </div>
  );
}
