import assert from "node:assert/strict";

import { buildProductFilters } from "../utils/productFilters.js";

const normalizeCategory = (value) => value;
const normalizePrice = (value) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    const error = new Error("invalid price");
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const sharedHelpers = {
  normalizeCategory,
  normalizePrice,
};

assert.deepEqual(
  buildProductFilters({
    nameSearch: "   ",
    skuSearch: "",
    ...sharedHelpers,
  }),
  {}
);

assert.deepEqual(
  buildProductFilters({
    nameSearch: "iphone",
    ...sharedHelpers,
  }),
  {
    $and: [
      {
        $or: [
          { title: { $regex: "iphone", $options: "i" } },
          { name: { $regex: "iphone", $options: "i" } },
        ],
      },
    ],
  }
);

assert.deepEqual(
  buildProductFilters({
    skuSearch: "IP16",
    ...sharedHelpers,
  }),
  {
    $and: [{ sku: { $regex: "IP16", $options: "i" } }],
  }
);

assert.deepEqual(
  buildProductFilters({
    nameSearch: "iphone",
    skuSearch: "IP",
    category: "Other",
    minPrice: "10",
    maxPrice: "100",
    stockStatus: "inStock",
    ...sharedHelpers,
  }),
  {
    $and: [
      {
        $or: [
          { title: { $regex: "iphone", $options: "i" } },
          { name: { $regex: "iphone", $options: "i" } },
        ],
      },
      { sku: { $regex: "IP", $options: "i" } },
      {
        $or: [
          { category: "Other" },
          { category: { $exists: false } },
          { category: null },
          { category: "" },
        ],
      },
      { price: { $gte: 10, $lte: 100 } },
    ],
  }
);

console.log("Product filter tests passed");
