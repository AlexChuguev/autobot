const FEED_URL = "./data/catalog-feed.json";
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='100%25' height='100%25' fill='%23eef2f7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2357636f' font-family='Arial' font-size='26'%3EНет изображения%3C/text%3E%3C/svg%3E";

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
  const source = data.sources.find((entry) => entry.id === (product && product.source));

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
      <a href="${product.categoryUrl}" target="_blank" rel="noreferrer">${escapeHtml(product.category)}</a>
      <span>/</span>
      <span>${escapeHtml(product.name)}</span>
    </nav>

    <article class="product-card-page">
      <div class="media-col">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
      </div>

      <div class="info-col">
        <p class="source-line">Источник: <a href="${source ? source.siteUrl : "#"}" target="_blank" rel="noreferrer">${
    source ? source.name : escapeHtml(product.source)
  }</a></p>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="sku">Артикул: ${escapeHtml(product.sku)}</p>
        <p class="price">${formatPrice(product.price)}</p>

        <div class="actions">
          <a class="btn" href="${product.sourceUrl}" target="_blank" rel="noreferrer">Оригинальная карточка</a>
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
