import Product from "../models/Product.js";
import InventoryLog from "../models/InventoryLog.js";
import InventoryHistory from "../models/InventoryHistory.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createInventoryLog, getChangeDetailsFromDelta } from "../utils/inventory.js";
import { buildProductFilters } from "../utils/productFilters.js";
import {
  createInventoryHistoryEntry,
  getHistoryActionFromChange,
} from "../utils/history.js";
import { DUPLICATE_SKU_MESSAGE, normalizeSku } from "../utils/sku.js";

const allowedCategories = new Set([
  "Electronics",
  "Grocery",
  "Clothing",
  "Other",
]);

const ensureSkuIsAvailable = async ({ sku, excludeProductId }) => {
  if (!sku) {
    return;
  }

  const existingProduct = await Product.findOne({
    sku,
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
  }).select("_id");

  if (existingProduct) {
    const error = new Error(DUPLICATE_SKU_MESSAGE);
    error.statusCode = 409;
    throw error;
  }
};

const normalizeLowStockThreshold = (value, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      const error = new Error("lowStockThreshold is required");
      error.statusCode = 400;
      throw error;
    }

    return undefined;
  }

  const numericLowStockThreshold = Number(value);

  if (
    !Number.isFinite(numericLowStockThreshold) ||
    numericLowStockThreshold < 0
  ) {
    const error = new Error(
      "lowStockThreshold must be a non-negative number"
    );
    error.statusCode = 400;
    throw error;
  }

  return numericLowStockThreshold;
};

const normalizeProductTitle = (value, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      const error = new Error("title or name is required");
      error.statusCode = 400;
      throw error;
    }

    return undefined;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    const error = new Error("title or name is required");
    error.statusCode = 400;
    throw error;
  }

  return normalizedValue;
};

const ensureMatchingValues = (firstValue, secondValue, firstLabel, secondLabel) => {
  if (
    firstValue !== undefined &&
    secondValue !== undefined &&
    String(firstValue) !== String(secondValue)
  ) {
    const error = new Error(
      `${firstLabel} and ${secondLabel} must match when both are provided`
    );
    error.statusCode = 400;
    throw error;
  }
};

const normalizeCategory = (value, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      const error = new Error("category is required");
      error.statusCode = 400;
      throw error;
    }

    return undefined;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    const error = new Error("category is required");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedCategories.has(normalizedValue)) {
    const error = new Error(
      `category must be one of: ${Array.from(allowedCategories).join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  return normalizedValue;
};

const normalizeQuantity = (value, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      const error = new Error("quantity is required");
      error.statusCode = 400;
      throw error;
    }

    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    const error = new Error("quantity must be a valid non-negative number");
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const normalizePrice = (value, fieldName, { required = false } = {}) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    if (required) {
      const error = new Error(`${fieldName} is required`);
      error.statusCode = 400;
      throw error;
    }

    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    const error = new Error(`${fieldName} must be a non-negative number`);
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const resolveProductName = ({ name, title }) => name ?? title;

const resolveProductQuantity = ({ quantity, stock }) => quantity ?? stock;

// Create a new product and record the initial stock as an inventory event.
export const createProduct = async (req, res) => {
  try {
    const {
      title,
      name,
      category,
      sku,
      stock,
      quantity,
      price,
      lowStockThreshold,
    } = req.body;

    ensureMatchingValues(name, title, "name", "title");
    ensureMatchingValues(quantity, stock, "quantity", "stock");

    if (
      resolveProductName({ name, title }) === undefined ||
      price === undefined ||
      resolveProductQuantity({ quantity, stock }) === undefined ||
      category === undefined ||
      lowStockThreshold === undefined
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: title/name, price, quantity, category, and lowStockThreshold are required",
      });
    }

    const normalizedTitle = normalizeProductTitle(
      resolveProductName({ name, title }),
      { required: true }
    );
    const normalizedQuantity = normalizeQuantity(
      resolveProductQuantity({ quantity, stock }),
      { required: true }
    );
    const normalizedCategory = normalizeCategory(category, { required: true });
    const normalizedSku = normalizeSku(sku);
    const normalizedLowStockThreshold = normalizeLowStockThreshold(
      lowStockThreshold,
      { required: true }
    );
    const normalizedPrice = normalizePrice(price, "price", { required: true });

    await ensureSkuIsAvailable({ sku: normalizedSku });

    console.log("Incoming data:", req.body);

    const product = await Product.create({
      title: normalizedTitle,
      category: normalizedCategory,
      sku: normalizedSku,
      stock: normalizedQuantity,
      price: normalizedPrice,
      lowStockThreshold: normalizedLowStockThreshold,
    });

    await createInventoryLog({
      productId: product._id,
      changeType: "increase",
      quantity: product.stock,
    });

    await createInventoryHistoryEntry({
      productId: product._id,
      change: product.stock,
      action: "added",
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Fetch all products for dashboard or listing screens.
export const getProducts = asyncHandler(async (req, res) => {
  console.log("GET /api/products req.query:", req.query);
  const query = buildProductFilters({
    ...req.query,
    normalizeCategory,
    normalizePrice,
  });
  console.log("GET /api/products final query:", JSON.stringify(query));
  let products = await Product.find(query).sort({ createdAt: -1 });

  if (req.query.stockStatus === "low") {
    products = products.filter((product) => product.stock <= product.lowStockThreshold);
  }

  if (req.query.stockStatus === "inStock") {
    products = products.filter((product) => product.stock > product.lowStockThreshold);
  }

  console.log("Results:", products.length);

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = (await Product.distinct("category"))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  const uncategorizedCount = await Product.countDocuments({
    $or: [
      { category: { $exists: false } },
      { category: null },
      { category: "" },
    ],
  });

  if (uncategorizedCount > 0 && !categories.includes("Other")) {
    categories.push("Other");
    categories.sort((left, right) => left.localeCompare(right));
  }

  res.json({ categories });
});

// Return products whose stock has fallen below the configured threshold.
export const getLowStockProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find({
    $expr: { $lte: ["$stock", "$lowStockThreshold"] },
  }).sort({ stock: 1, title: 1 });

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

// Fetch a single product by its MongoDB id.
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({
    success: true,
    data: product,
  });
});

// Update product details and log stock movements when inventory changes.
export const updateProduct = asyncHandler(async (req, res) => {
  const {
    title,
    name,
    category,
    sku,
    stock,
    quantity,
    price,
    lowStockThreshold,
    change,
  } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  ensureMatchingValues(name, title, "name", "title");
  ensureMatchingValues(quantity, stock, "quantity", "stock");

  const hasQuantityInput = quantity !== undefined || stock !== undefined;

  if (hasQuantityInput && change !== undefined) {
    res.status(400);
    throw new Error("Provide either quantity/stock or change, not both");
  }

  let stockDelta = 0;

  if (change !== undefined) {
    const numericChange = Number(change);

    if (Number.isNaN(numericChange) || numericChange === 0) {
      res.status(400);
      throw new Error("Change must be a non-zero number");
    }

    const updatedStock = product.stock + numericChange;

    if (updatedStock < 0) {
      res.status(400);
      throw new Error("Stock cannot go below zero");
    }

    stockDelta = numericChange;
    product.stock = updatedStock;
  }

  if (hasQuantityInput) {
    const normalizedQuantity = normalizeQuantity(
      resolveProductQuantity({ quantity, stock })
    );

    stockDelta = normalizedQuantity - product.stock;
    product.stock = normalizedQuantity;
  }

  const normalizedTitle = resolveProductName({ name, title });

  if (normalizedTitle !== undefined) {
    product.title = normalizedTitle;
  }

  if (category !== undefined) {
    product.category = normalizeCategory(category);
  }

  if (sku !== undefined) {
    const normalizedSku = normalizeSku(sku);

    await ensureSkuIsAvailable({
      sku: normalizedSku,
      excludeProductId: product._id,
    });

    product.sku = normalizedSku;
  }

  if (price !== undefined) {
    product.price = normalizePrice(price, "price");
  }

  if (lowStockThreshold !== undefined) {
    product.lowStockThreshold = normalizeLowStockThreshold(lowStockThreshold);
  }

  const updatedProduct = await product.save();
  const changeDetails = getChangeDetailsFromDelta(stockDelta);

  if (changeDetails) {
    await createInventoryLog({
      productId: updatedProduct._id,
      changeType: changeDetails.changeType,
      quantity: changeDetails.quantity,
    });
  }

  await createInventoryHistoryEntry({
    productId: updatedProduct._id,
    change: stockDelta,
    action: getHistoryActionFromChange(stockDelta),
  });

  res.json({
    success: true,
    message: "Product updated successfully",
    data: updatedProduct,
  });
});

// Delete a product and clean up related inventory logs.
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await InventoryLog.deleteMany({ productId: product._id });
  await InventoryHistory.deleteMany({ productId: product._id });
  await product.deleteOne();

  res.json({
    success: true,
    message: "Product deleted successfully",
  });
});
