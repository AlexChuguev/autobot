const FEED_URL = "./data/catalog-feed.json";
const FALLBACK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderParamsTable(params) {
  return Object.entries(params)
    .map(
      ([key, value]) => `
        <tr>
          <th scope="row">${escapeHtml(key)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");
}

async function initProductPage() {
  const page = document.getElementById("productPage");
  const url = new URL(window.location.href);
  const hashId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const productId = hashId || url.searchParams.get("id");

  if (!productId) {
    page.innerHTML = `
      <div class="error-state">
        <h1>Товар не выбран</h1>
        <p>Передайте ID товара в URL: <code>product.html#id</code>.</p>
        <a href="./index.html">Вернуться в каталог</a>
      </div>
    `;
    return;
  }

  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить фид: ${response.status}`);
  }

  const data = await response.json();
  const product = data.products.find((item) => item.id === productId);

  if (!product) {
    page.innerHTML = `
      <div class="error-state">
        <h1>Товар не найден</h1>
        <p>Проверьте корректность идентификатора товара.</p>
        <a href="./index.html">Вернуться в каталог</a>
      </div>
    `;
    return;
  }

  page.innerHTML = `
    <nav class="breadcrumbs" aria-label="Хлебные крошки">
      <a href="./index.html">Каталог</a>
      <span>/</span>
      <span>${escapeHtml(product.category)}</span>
      <span>/</span>
      <span>${escapeHtml(product.name)}</span>
    </nav>

    <article class="product-card-page">
      <div class="media-col">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
      </div>

      <div class="info-col">
        <p class="source-line">Источник: ${escapeHtml(product.source)}</p>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="sku">Артикул: ${escapeHtml(product.sku)}</p>
        <p class="price">${formatPrice(product.price)}</p>

        <div class="actions">
          <a class="btn secondary" href="./index.html">Назад в каталог</a>
        </div>

        <section class="params">
          <h2>Параметры товара</h2>
          <table>
            <tbody>
              ${renderParamsTable(product.params)}
            </tbody>
          </table>
        </section>
      </div>
    </article>
  `;
}

initProductPage().catch((error) => {
  const page = document.getElementById("productPage");
  page.innerHTML = `<div class="error-state"><h1>Ошибка</h1><p>${escapeHtml(error.message)}</p></div>`;
});
