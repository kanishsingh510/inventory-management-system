export function buildProductQueryParams(filters = {}) {
  const rawParams = {
    nameSearch: filters.nameSearch?.trim() || undefined,
    skuSearch: filters.skuSearch?.trim() || undefined,
    category: filters.category?.trim() || undefined,
    minPrice:
      filters.minPrice !== "" && filters.minPrice !== undefined
        ? Number(filters.minPrice)
        : undefined,
    maxPrice:
      filters.maxPrice !== "" && filters.maxPrice !== undefined
        ? Number(filters.maxPrice)
        : undefined,
    stockStatus: filters.stockStatus?.trim() || undefined,
  };

  return Object.fromEntries(
    Object.entries(rawParams).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
}
