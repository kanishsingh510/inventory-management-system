const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createCaseInsensitiveRegexFilter = (field, value) => ({
  [field]: { $regex: value, $options: "i" },
});

export const buildProductFilters = ({
  nameSearch,
  skuSearch,
  category,
  stockStatus,
  minPrice,
  maxPrice,
  normalizeCategory,
  normalizePrice,
} = {}) => {
  const query = {};
  const andConditions = [];
  const normalizedNameSearch = nameSearch?.trim();
  const normalizedSkuSearch = skuSearch?.trim();
  const normalizedCategory = category?.trim();

  if (normalizedNameSearch) {
    const escapedNameSearch = escapeRegex(normalizedNameSearch);

    andConditions.push({
      $or: [
        createCaseInsensitiveRegexFilter("title", escapedNameSearch),
        createCaseInsensitiveRegexFilter("name", escapedNameSearch),
      ],
    });
  }

  if (normalizedSkuSearch) {
    andConditions.push(
      createCaseInsensitiveRegexFilter(
        "sku",
        escapeRegex(normalizedSkuSearch)
      )
    );
  }

  if (normalizedCategory && normalizedCategory !== "All Categories") {
    const validatedCategory = normalizeCategory(normalizedCategory);

    if (validatedCategory === "Other") {
      andConditions.push({
        $or: [
          { category: "Other" },
          { category: { $exists: false } },
          { category: null },
          { category: "" },
        ],
      });
    } else {
      andConditions.push({ category: validatedCategory });
    }
  }

  const normalizedMinPrice = normalizePrice(minPrice, "minPrice");
  const normalizedMaxPrice = normalizePrice(maxPrice, "maxPrice");

  if (
    normalizedMinPrice !== undefined &&
    normalizedMaxPrice !== undefined &&
    normalizedMinPrice > normalizedMaxPrice
  ) {
    const error = new Error("minPrice cannot be greater than maxPrice");
    error.statusCode = 400;
    throw error;
  }

  if (
    normalizedMinPrice !== undefined ||
    normalizedMaxPrice !== undefined
  ) {
    andConditions.push({
      price: {
        ...(normalizedMinPrice !== undefined ? { $gte: normalizedMinPrice } : {}),
        ...(normalizedMaxPrice !== undefined ? { $lte: normalizedMaxPrice } : {}),
      },
    });
  }

  if (
    stockStatus !== undefined &&
    stockStatus !== "low" &&
    stockStatus !== "inStock" &&
    stockStatus !== ""
  ) {
    const error = new Error("stockStatus must be either low or inStock");
    error.statusCode = 400;
    throw error;
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
};
