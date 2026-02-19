const FEED_URL = "./data/catalog-feed.json";
const FACET_PARAM_KEYS = [
  "Макс. время полета",
  "Дальность передачи сигнала",
  "Разрешение видео",
  "Время автономной работы",
  "Полезная нагрузка",
  "Класс защиты",
  "Класс"
];

const state = {
  products: [],
  sources: [],
  selectedSources: new Set(),
  selectedCategories: new Set(),
  selectedBrands: new Set(),
  selectedParamValues: {},
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

function getBrand(product) {
  return product.params["Бренд"] || "Без бренда";
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

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function renderFilters() {
  const sourceDisplayMap = Object.fromEntries(
    state.sources.map((item) => [item.id, item.name])
  );
  renderCheckboxOptions(
    el.sourceFilters,
    "source",
    state.sources.map((item) => item.id),
    state.selectedSources,
    sourceDisplayMap
  );

  renderCheckboxOptions(
    el.categoryFilters,
    "category",
    uniqueSorted(state.products.map((item) => item.category)),
    state.selectedCategories
  );

  renderCheckboxOptions(
    el.brandFilters,
    "brand",
    uniqueSorted(state.products.map(getBrand)),
    state.selectedBrands
  );

  el.paramFilters.innerHTML = "";

  for (const key of FACET_PARAM_KEYS) {
    const values = uniqueSorted(
      state.products.map((product) => product.params[key]).filter(Boolean)
    );

    if (values.length === 0) {
      continue;
    }

    if (!state.selectedParamValues[key]) {
      state.selectedParamValues[key] = new Set();
    }

    const block = document.createElement("fieldset");
    block.className = "param-group";
    block.innerHTML = `<legend>${key}</legend>`;

    for (const value of values) {
      const id = `param-${slugify(key)}-${slugify(value)}`;
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `
        <input type="checkbox" id="${id}" data-param-key="${key}" value="${value}" ${
          state.selectedParamValues[key].has(value) ? "checked" : ""
        } />
        <span>${value}</span>
      `;
      block.appendChild(label);
    }

    el.paramFilters.appendChild(block);
  }
}

function productMatchesSearch(product, query) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  const haystack = [
    product.name,
    product.sku,
    product.category,
    sourceName(product.source),
    ...Object.entries(product.params).map(([key, value]) => `${key} ${value}`)
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function matchesParamFilters(product) {
  for (const [key, selectedValues] of Object.entries(state.selectedParamValues)) {
    if (selectedValues.size === 0) {
      continue;
    }

    const paramValue = product.params[key];
    if (!paramValue || !selectedValues.has(paramValue)) {
      return false;
    }
  }

  return true;
}

function filteredProducts() {
  return state.products.filter((product) => {
    if (state.selectedSources.size > 0 && !state.selectedSources.has(product.source)) {
      return false;
    }

    if (state.selectedCategories.size > 0 && !state.selectedCategories.has(product.category)) {
      return false;
    }

    const brand = getBrand(product);
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

    if (!matchesParamFilters(product)) {
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

function chipsFromParams(params) {
  return FACET_PARAM_KEYS.filter((key) => params[key])
    .slice(0, 3)
    .map((key) => `<li>${key}: ${params[key]}</li>`)
    .join("");
}

function productPageLink(productId) {
  return `./product.html#${encodeURIComponent(productId)}`;
}

function renderProducts() {
  const filtered = filteredProducts();
  const list = sortedProducts(filtered);

  el.resultsCount.textContent = `Найдено товаров: ${list.length}`;
  el.productList.innerHTML = "";

  if (list.length === 0) {
    el.productList.innerHTML = `<li class="empty">По заданным фильтрам товары не найдены.</li>`;
    return;
  }

  for (const product of list) {
    const item = document.createElement("li");
    item.className = "product-item";
    item.innerHTML = `
      <article class="card">
        <a class="media" href="${productPageLink(product.id)}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </a>
        <div class="card-body">
          <div class="meta">
            <span class="badge">${sourceName(product.source)}</span>
            <a href="${product.categoryUrl}" target="_blank" rel="noreferrer">${product.category}</a>
          </div>
          <h3><a href="${productPageLink(product.id)}">${product.name}</a></h3>
          <p class="sku">Артикул: ${product.sku}</p>
          <ul class="chips">${chipsFromParams(product.params)}</ul>
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
    }

    if (target.name === "category") {
      applyCheckboxState("category", state.selectedCategories);
      renderProducts();
    }

    if (target.name === "brand") {
      applyCheckboxState("brand", state.selectedBrands);
      renderProducts();
    }

    if (target.dataset.paramKey) {
      const key = target.dataset.paramKey;
      if (!state.selectedParamValues[key]) {
        state.selectedParamValues[key] = new Set();
      }

      if (target.checked) {
        state.selectedParamValues[key].add(target.value);
      } else {
        state.selectedParamValues[key].delete(target.value);
      }
      renderProducts();
    }

    if (target.id === "priceMin") {
      state.priceMin = target.value ? Number(target.value) : null;
      renderProducts();
    }

    if (target.id === "priceMax") {
      state.priceMax = target.value ? Number(target.value) : null;
      renderProducts();
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

    for (const key of Object.keys(state.selectedParamValues)) {
      state.selectedParamValues[key].clear();
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

async function init() {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить фид: ${response.status}`);
  }

  const data = await response.json();
  state.products = data.products;
  state.sources = data.sources;

  renderFilters();
  renderProducts();
  bindEvents();
}

init().catch((error) => {
  el.productList.innerHTML = `<li class="empty">Ошибка загрузки каталога: ${error.message}</li>`;
});
