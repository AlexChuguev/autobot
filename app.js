const FEED_URL = "/data/catalog-feed.json";
const ATTRIBUTES_URL = "/data/attributes.json";
const CATEGORIES_URL = "/data/categories.json";
const FACETS_URL = "/data/facets.json";
const FALLBACK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const state = {
  products: [],
  sources: [],
  attributes: [],
  categories: [],
  facets: null,
  attributeByCode: {},
  categoryIdByName: {},
  selectedSources: new Set(),
  selectedCategories: new Set(),
  selectedBrands: new Set(),
  selectedAttributeValues: {},
  search: "",
  priceMin: null,
  priceMax: null,
  sort: "default"
};

const el = {
  searchInput: document.getElementById("searchInput"),
  sourceFilters: document.getElementById("sourceFilters"),
  categoryFilters: document.getElementById("categoryFilters"),
  brandFilters: document.getElementById("brandFilters"),
  paramFilters: document.getElementById("paramFilters"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  sortSelect: document.getElementById("sortSelect"),
  productList: document.getElementById("productList"),
  resultsCount: document.getElementById("resultsCount")
};

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function sourceName(sourceId) {
  const source = state.sources.find((item) => item.id === sourceId);
  return source ? source.name : sourceId;
}

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function productCategoryId(product) {
  return state.categoryIdByName[product.category] || slugify(product.category);
}

function getAttributeValue(product, attributeCode) {
  const attribute = state.attributeByCode[attributeCode];
  if (!attribute) {
    return null;
  }
  return product.params[attribute.sourceKey] || null;
}


function initialCategoryFromUrl() {
  const dataCategory = document.body.dataset.categoryId;
  if (dataCategory) {
    return dataCategory;
  }

  const url = new URL(window.location.href);
  const category = url.searchParams.get("category");
  return category || "";
}

function renderCheckboxOptions(container, name, values, selectedSet, displayMap = {}) {
  container.innerHTML = "";

  for (const value of values) {
    const id = `${name}-${slugify(value)}`;
    const labelText = displayMap[value] || value;
    const label = document.createElement("label");
    label.className = "option";
    label.innerHTML = `
      <input type="checkbox" id="${id}" name="${name}" value="${value}" ${
        selectedSet.has(value) ? "checked" : ""
      } />
      <span>${labelText}</span>
    `;
    container.appendChild(label);
  }
}

function activeCategoryIds() {
  if (state.selectedCategories.size > 0) {
    return [...state.selectedCategories];
  }
  return state.categories.map((item) => item.id);
}

function categoryRange() {
  let min = Infinity;
  let max = -Infinity;

  for (const categoryId of activeCategoryIds()) {
    const facet = state.facets.categories[categoryId];
    if (!facet || !facet.price) {
      continue;
    }
    min = Math.min(min, facet.price.min);
    max = Math.max(max, facet.price.max);
  }

  if (min === Infinity || max === -Infinity) {
    return state.facets.global.price;
  }

  return { min, max };
}

function facetValuesForAttribute(attributeCode) {
  const counts = new Map();

  for (const categoryId of activeCategoryIds()) {
    const facetCategory = state.facets.categories[categoryId];
    const values = facetCategory && facetCategory.attributes[attributeCode]
      ? facetCategory.attributes[attributeCode].values
      : [];

    for (const entry of values) {
      counts.set(entry.value, (counts.get(entry.value) || 0) + entry.count);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "ru"));
}

function activeFilterAttributes() {
  const activeIds = new Set(activeCategoryIds());
  const codes = new Set();

  for (const category of state.categories) {
    if (!activeIds.has(category.id)) {
      continue;
    }
    for (const code of category.filterAttributes || []) {
      const attr = state.attributeByCode[code];
      if (attr && attr.filterable) {
        codes.add(code);
      }
    }
  }

  return state.attributes
    .filter((attr) => codes.has(attr.code))
    .sort((a, b) => a.order - b.order);
}

function renderAttributeFilterBlocks() {
  el.paramFilters.innerHTML = "";

  for (const attribute of activeFilterAttributes()) {
    if (attribute.code === "brand") {
      continue;
    }

    const options = facetValuesForAttribute(attribute.code);
    if (options.length === 0) {
      continue;
    }

    if (!state.selectedAttributeValues[attribute.code]) {
      state.selectedAttributeValues[attribute.code] = new Set();
    }

    const block = document.createElement("fieldset");
    block.className = "param-group";
    block.innerHTML = `<legend>${attribute.name}</legend>`;

    for (const option of options) {
      const id = `param-${slugify(attribute.code)}-${slugify(option.value)}`;
      const checked = state.selectedAttributeValues[attribute.code].has(option.value)
        ? "checked"
        : "";
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `
        <input type="checkbox" id="${id}" data-attr-code="${attribute.code}" value="${option.value}" ${checked} />
        <span>${option.value} (${option.count})</span>
      `;
      block.appendChild(label);
    }

    el.paramFilters.appendChild(block);
  }
}

function renderFilters() {
  const sourceDisplayMap = Object.fromEntries(state.sources.map((item) => [item.id, item.name]));
  renderCheckboxOptions(
    el.sourceFilters,
    "source",
    state.sources.map((item) => item.id),
    state.selectedSources,
    sourceDisplayMap
  );

  const categoryDisplayMap = Object.fromEntries(state.categories.map((item) => [item.id, item.name]));
  renderCheckboxOptions(
    el.categoryFilters,
    "category",
    state.categories.slice().sort((a, b) => a.order - b.order).map((item) => item.id),
    state.selectedCategories,
    categoryDisplayMap
  );

  const brandOptions = facetValuesForAttribute("brand");
  renderCheckboxOptions(
    el.brandFilters,
    "brand",
    brandOptions.map((item) => item.value),
    state.selectedBrands,
    Object.fromEntries(brandOptions.map((item) => [item.value, `${item.value} (${item.count})`]))
  );

  const range = categoryRange();
  el.priceMin.placeholder = String(range.min);
  el.priceMax.placeholder = String(range.max);

  renderAttributeFilterBlocks();
}

function productMatchesSearch(product, query) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  const paramsText = Object.entries(product.params)
    .map(([key, value]) => `${key} ${value}`)
    .join(" ");

  return [product.name, product.sku, product.category, sourceName(product.source), paramsText]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function matchesAttributeFilters(product) {
  const activeCodes = new Set(activeFilterAttributes().map((attribute) => attribute.code));

  for (const [code, selectedValues] of Object.entries(state.selectedAttributeValues)) {
    if (!activeCodes.has(code)) {
      continue;
    }

    if (selectedValues.size === 0) {
      continue;
    }

    const value = getAttributeValue(product, code);
    if (!value || !selectedValues.has(value)) {
      return false;
    }
  }

  return true;
}

function filteredProducts() {
  return state.products.filter((product) => {
    const categoryId = productCategoryId(product);

    if (state.selectedSources.size > 0 && !state.selectedSources.has(product.source)) {
      return false;
    }

    if (state.selectedCategories.size > 0 && !state.selectedCategories.has(categoryId)) {
      return false;
    }

    const brand = getAttributeValue(product, "brand") || "Без бренда";
    if (state.selectedBrands.size > 0 && !state.selectedBrands.has(brand)) {
      return false;
    }

    if (state.priceMin !== null && product.price < state.priceMin) {
      return false;
    }

    if (state.priceMax !== null && product.price > state.priceMax) {
      return false;
    }

    if (!productMatchesSearch(product, state.search)) {
      return false;
    }

    if (!matchesAttributeFilters(product)) {
      return false;
    }

    return true;
  });
}

function sortedProducts(list) {
  const copy = [...list];

  if (state.sort === "price-asc") {
    return copy.sort((a, b) => a.price - b.price);
  }

  if (state.sort === "price-desc") {
    return copy.sort((a, b) => b.price - a.price);
  }

  if (state.sort === "name-asc") {
    return copy.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  if (state.sort === "name-desc") {
    return copy.sort((a, b) => b.name.localeCompare(a.name, "ru"));
  }

  return copy;
}

function chipsFromParams(product) {
  const chips = state.attributes
    .filter((attribute) => attribute.displayInCard && attribute.code !== "brand")
    .sort((a, b) => a.order - b.order)
    .map((attribute) => {
      const value = getAttributeValue(product, attribute.code);
      return value ? `<li>${attribute.name}: ${value}</li>` : "";
    })
    .filter(Boolean)
    .slice(0, 3);

  return chips.join("");
}

function productPageLink(productId) {
  return `/product.html#${encodeURIComponent(productId)}`;
}

function renderProducts() {
  const list = sortedProducts(filteredProducts());

  el.resultsCount.textContent = `Найдено товаров: ${list.length}`;
  el.productList.innerHTML = "";

  if (list.length === 0) {
    el.productList.innerHTML = `<li class="empty">По заданным фильтрам товары не найдены.</li>`;
    return;
  }

  for (const product of list) {
    const imageSrc = product.image || FALLBACK_IMAGE;
    const item = document.createElement("li");
    item.className = "product-item";
    item.innerHTML = `
      <article class="card">
        <a class="media" href="${productPageLink(product.id)}">
          <img src="${imageSrc}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </a>
        <div class="card-body">
          <div class="meta">
            <span class="badge">${sourceName(product.source)}</span>
            <span>${product.category}</span>
          </div>
          <h3><a href="${productPageLink(product.id)}">${product.name}</a></h3>
          <p class="sku">Артикул: ${product.sku}</p>
          <ul class="chips">${chipsFromParams(product)}</ul>
          <div class="card-footer">
            <strong>${formatPrice(product.price)}</strong>
            <a class="more" href="${productPageLink(product.id)}">Открыть карточку</a>
          </div>
        </div>
      </article>
    `;
    el.productList.appendChild(item);
  }
}

function applyCheckboxState(name, selectedSet) {
  const selectedValues = [...document.querySelectorAll(`input[name='${name}']:checked`)].map(
    (node) => node.value
  );

  selectedSet.clear();
  for (const value of selectedValues) {
    selectedSet.add(value);
  }
}

function bindEvents() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.name === "source") {
      applyCheckboxState("source", state.selectedSources);
      renderProducts();
      return;
    }

    if (target.name === "category") {
      applyCheckboxState("category", state.selectedCategories);
      renderFilters();
      renderProducts();
      return;
    }

    if (target.name === "brand") {
      applyCheckboxState("brand", state.selectedBrands);
      renderProducts();
      return;
    }

    if (target.dataset.attrCode) {
      const code = target.dataset.attrCode;
      if (!state.selectedAttributeValues[code]) {
        state.selectedAttributeValues[code] = new Set();
      }

      if (target.checked) {
        state.selectedAttributeValues[code].add(target.value);
      } else {
        state.selectedAttributeValues[code].delete(target.value);
      }
      renderProducts();
      return;
    }

    if (target.id === "priceMin") {
      state.priceMin = target.value ? Number(target.value) : null;
      renderProducts();
      return;
    }

    if (target.id === "priceMax") {
      state.priceMax = target.value ? Number(target.value) : null;
      renderProducts();
      return;
    }

    if (target.id === "sortSelect") {
      state.sort = target.value;
      renderProducts();
    }
  });

  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderProducts();
  });

  el.resetFiltersBtn.addEventListener("click", () => {
    state.selectedSources.clear();
    state.selectedCategories.clear();
    state.selectedBrands.clear();

    for (const code of Object.keys(state.selectedAttributeValues)) {
      state.selectedAttributeValues[code].clear();
    }

    state.search = "";
    state.priceMin = null;
    state.priceMax = null;
    state.sort = "default";

    el.searchInput.value = "";
    el.priceMin.value = "";
    el.priceMax.value = "";
    el.sortSelect.value = "default";

    renderFilters();
    renderProducts();
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url}: ${response.status}`);
  }
  return response.json();
}

async function init() {
  const [feed, attributesData, categoriesData, facetsData] = await Promise.all([
    fetchJson(FEED_URL),
    fetchJson(ATTRIBUTES_URL),
    fetchJson(CATEGORIES_URL),
    fetchJson(FACETS_URL)
  ]);

  state.products = feed.products;
  state.sources = feed.sources;
  state.attributes = attributesData.attributes;
  state.categories = categoriesData.categories;
  state.facets = facetsData;
  state.attributeByCode = Object.fromEntries(state.attributes.map((attr) => [attr.code, attr]));
  state.categoryIdByName = Object.fromEntries(state.categories.map((cat) => [cat.name, cat.id]));

  const initialCategory = initialCategoryFromUrl();
  if (initialCategory && state.categories.some((cat) => cat.id === initialCategory)) {
    state.selectedCategories.add(initialCategory);
  }

  renderFilters();
  renderProducts();
  bindEvents();
}

init().catch((error) => {
  el.productList.innerHTML = `<li class="empty">Ошибка загрузки каталога: ${error.message}</li>`;
});
