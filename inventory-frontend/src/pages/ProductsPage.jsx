import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import StatusMessage from '../components/StatusMessage';
import { getApiErrorMessage } from '../services/api';
import {
  deleteProduct,
  getCategories,
  getInventoryHistory,
  getProducts
} from '../services/products';

const initialFilters = {
  nameSearch: '',
  skuSearch: '',
  category: '',
  stockStatus: '',
  minPrice: '',
  maxPrice: ''
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function HistoryModal({ error, history, isLoading, onClose, product }) {
  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <Card className="max-h-[85vh] w-full max-w-4xl overflow-hidden fade-in-up">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Inventory History
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">{product.title}</h3>
            <p className="mt-1 text-sm text-slate-400">SKU: {product.sku || 'Unavailable'}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner label="Loading inventory history..." />
          ) : error ? (
            <StatusMessage type="error">{error}</StatusMessage>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-4 py-12 text-center text-sm text-slate-400">
              No inventory history found for this product.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.22em] text-slate-400">
                <tr>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-white/5 text-slate-300 last:border-b-0"
                  >
                    <td className="px-3 py-4">{formatDate(entry.date)}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                          entry.action === 'Sold'
                            ? 'border border-rose-300/25 bg-rose-400/10 text-rose-200'
                            : 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
                        }`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-semibold text-white">{entry.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nameSearch, setNameSearch] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState('');
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [message, setMessage] = useState(location.state?.message ?? '');
  const [error, setError] = useState('');
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);

  async function fetchProducts(overrides = {}) {
    const filters = {
      nameSearch,
      skuSearch,
      category,
      minPrice,
      maxPrice,
      stockStatus,
      ...overrides
    };

    console.log('Fetching products with filters:', filters);
    return getProducts(filters);
  }

  useEffect(() => {
    console.log('Products search input changed:', {
      nameSearch: nameSearch.trim(),
      skuSearch: skuSearch.trim()
    });
  }, [nameSearch, skuSearch]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialData() {
      try {
        const [categoryData, productData] = await Promise.all([
          getCategories(),
          fetchProducts()
        ]);

        if (!isActive) {
          return;
        }

        setCategories(categoryData);
        setProducts(productData);
        setHasLoadedProducts(true);
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedProducts) {
      return undefined;
    }

    let isActive = true;

    async function loadProducts() {
      setIsRefreshing(true);
      setError('');

      try {
        const data = await fetchProducts();

        if (isActive) {
          setProducts(data);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setHasLoadedProducts(true);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [nameSearch, skuSearch, category, minPrice, maxPrice, stockStatus, hasLoadedProducts]);

  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  function handleClearFilters() {
    setNameSearch(initialFilters.nameSearch);
    setSkuSearch(initialFilters.skuSearch);
    setCategory(initialFilters.category);
    setStockStatus(initialFilters.stockStatus);
    setMinPrice(initialFilters.minPrice);
    setMaxPrice(initialFilters.maxPrice);
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete "${product.title}" from inventory?`);

    if (!confirmed) {
      return;
    }

    setActiveDeleteId(product.id);
    setError('');
    setMessage('');

    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage(`"${product.title}" was deleted successfully.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActiveDeleteId('');
    }
  }

  async function handleViewHistory(product) {
    setHistoryProduct(product);
    setHistoryItems([]);
    setHistoryError('');
    setIsHistoryLoading(true);

    try {
      const data = await getInventoryHistory(product.id);
      setHistoryItems(data);
    } catch (requestError) {
      setHistoryError(getApiErrorMessage(requestError));
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function handleCloseHistory() {
    setHistoryProduct(null);
    setHistoryItems([]);
    setHistoryError('');
    setIsHistoryLoading(false);
  }

  return (
    <section>
      <PageHeader
        badge="Product Catalog"
        title="Manage every product from one responsive workspace"
        description="Browse inventory items from the API, review low stock flags, update details, and remove products that are no longer needed."
        actions={
          <Link to="/products/new">
            <Button>Add Product</Button>
          </Link>
        }
      />

      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <Card className="mb-6 fade-in-up">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Search and filter</h3>
              <p className="mt-1 text-sm text-slate-300">
                Results update automatically as you type or change filters.
              </p>
            </div>
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Search by product name
              </span>
              <input
                type="text"
                value={nameSearch}
                onChange={(event) => setNameSearch(event.target.value)}
                placeholder="Search by product name..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
              />
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Search product titles in real time
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Search by SKU
              </span>
              <input
                type="text"
                value={skuSearch}
                onChange={(event) => setSkuSearch(event.target.value)}
                placeholder="Search by SKU..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
              />
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Search SKU codes separately without changing other filters
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Stock status
              </span>
              <select
                value={stockStatus}
                onChange={(event) => setStockStatus(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
              >
                <option value="">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="inStock">In Stock</option>
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Min price
                </span>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Max price
                </span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="500"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
            <span>
              Showing <span className="font-semibold text-white">{products.length}</span> result
              {products.length === 1 ? '' : 's'}
            </span>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-2 text-cyan-200">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200/40 border-t-cyan-200" />
                Updating results...
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner label="Loading products..." />
      ) : products.length === 0 ? (
        <Card className="py-12 text-center fade-in-up">
          <h3 className="text-xl font-bold text-white">No products found</h3>
          <p className="mt-3 text-sm text-slate-300">
            Create your first item to start tracking inventory and low stock alerts.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="fade-in-up">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{product.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Product ID: {product.id || 'Unavailable'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Category: {product.category || 'Other'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    SKU: {product.sku || 'Unavailable'}
                  </p>
                </div>
                {product.isLowStock === true ? (
                  <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                    Low Stock
                  </span>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Stock</span>
                  <span className="font-semibold text-white">{product.stock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Price</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Low stock alert</span>
                  <span className="font-semibold text-white">
                    {product.lowStockThreshold}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => handleViewHistory(product)}
                >
                  View History
                </Button>
                <Link
                  to={`/products/${product.id}/edit`}
                  state={{ product }}
                  className="flex-1"
                >
                  <Button variant="secondary" className="w-full">
                    Update
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={activeDeleteId === product.id}
                  onClick={() => handleDelete(product)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <HistoryModal
        error={historyError}
        history={historyItems}
        isLoading={isHistoryLoading}
        onClose={handleCloseHistory}
        product={historyProduct}
      />
    </section>
  );
}
