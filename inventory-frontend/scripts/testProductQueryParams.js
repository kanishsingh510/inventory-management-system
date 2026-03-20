import assert from "node:assert/strict";

import { buildProductQueryParams } from "../src/services/productQueryParams.js";

assert.deepEqual(
  buildProductQueryParams({
    nameSearch: "   ",
    skuSearch: "",
    category: "",
    stockStatus: "",
  }),
  {}
);

assert.deepEqual(
  buildProductQueryParams({
    nameSearch: " iphone ",
    skuSearch: " ip16 ",
  }),
  {
    nameSearch: "iphone",
    skuSearch: "ip16",
  }
);

assert.deepEqual(
  buildProductQueryParams({
    nameSearch: "iphone",
    skuSearch: "IP16",
    category: "Other",
    minPrice: "0",
    maxPrice: "500",
    stockStatus: "inStock",
  }),
  {
    nameSearch: "iphone",
    skuSearch: "IP16",
    category: "Other",
    minPrice: 0,
    maxPrice: 500,
    stockStatus: "inStock",
  }
);

console.log("Product query param tests passed");
