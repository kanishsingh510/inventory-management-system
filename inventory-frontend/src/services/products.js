import api from './api';
import { buildProductQueryParams } from './productQueryParams';

function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.products)) {
    return payload.products;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function extractItem(payload) {
  return payload?.product ?? payload?.data ?? payload;
}

function normalizeProduct(product = {}) {
  return {
    id: product.id ?? product._id ?? product.productId ?? '',
    title: product.title ?? product.name ?? 'Untitled product',
    category: product.category ?? '',
    sku: product.sku ?? '',
    lowStockThreshold:
      product.lowStockThreshold !== undefined && product.lowStockThreshold !== null
        ? Number(product.lowStockThreshold)
        : '',
    isLowStock: Boolean(product.isLowStock),
    stock: Number(product.stock ?? product.quantity ?? 0),
    price: Number(product.price ?? 0)
  };
}

function normalizeHistoryEntry(entry = {}) {
  const quantity = Number(entry.quantity ?? 0);
  const changeType = entry.changeType ?? entry.type ?? 'increase';

  return {
    id: entry.id ?? entry._id ?? `${changeType}-${entry.date ?? entry.createdAt ?? quantity}`,
    date: entry.date ?? entry.createdAt ?? '',
    action: changeType === 'decrease' ? 'Sold' : 'Added',
    change: `${changeType === 'decrease' ? '-' : '+'}${Math.abs(quantity)}`
  };
}

function serializeProductInput(product) {
  const payload = {
    title: product.title,
    category: product.category,
    sku: product.sku,
    stock: Number(product.stock),
    price: Number(product.price),
    lowStockThreshold: Number(product.lowStockThreshold)
  };

  return payload;
}

function serializeCreateProductInput(product) {
  const title = product.title;
  const sku = product.sku;
  const price = product.price;
  const quantity = product.stock ?? product.quantity;
  const category = product.category?.trim?.() ?? product.category;
  const lowStockThreshold = product.lowStockThreshold;

  if (!category) {
    throw new Error('Category is required.');
  }

  return {
    name: title,
    sku,
    price: Number(price),
    quantity: Number(quantity),
    category,
    lowStockThreshold: Number(lowStockThreshold)
  };
}

export async function getProducts(filters = {}) {
  const params = buildProductQueryParams(filters);

  console.log('Product search values:', {
    nameSearch: filters.nameSearch?.trim() ?? '',
    skuSearch: filters.skuSearch?.trim() ?? ''
  });
  console.log('GET /products params:', params);

  const response = await api.get('/products', { params });
  return extractCollection(response.data).map(normalizeProduct);
}

export async function getProduct(id) {
  const products = await getProducts();
  return products.find((product) => product.id === id) ?? null;
}

export async function createProduct(product) {
  const data = serializeCreateProductInput(product);

  console.log('Sending data:', data);

  const response = await api.post('/products', data);
  return normalizeProduct(extractItem(response.data));
}

export async function updateProduct(id, product) {
  const payload = serializeProductInput(product);
  const response = await api.put(`/products/${id}`, payload);
  return normalizeProduct(extractItem(response.data));
}

export async function deleteProduct(id) {
  return api.delete(`/products/${id}`);
}

export async function updateInventory({ productId, quantity, type }) {
  const response = await api.post('/inventory/update', {
    productId,
    quantity: Number(quantity),
    type
  });

  return normalizeProduct(extractItem(response.data));
}

export async function getLowStockProducts() {
  const response = await api.get('/products/low-stock');
  return extractCollection(response.data).map(normalizeProduct);
}

export async function getCategories() {
  const response = await api.get('/categories');
  return response.data?.categories ?? extractCollection(response.data);
}

export async function getInventoryHistory(productId) {
  const response = await api.get(`/history/${productId}`);
  return extractCollection(response.data).map(normalizeHistoryEntry);
}
