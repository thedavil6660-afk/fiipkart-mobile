let currentProducts = [];
let activeCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
  initCartBadge();
  fetchProducts();

  document.querySelectorAll('.category-item').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.getAttribute('data-cat');
      fetchProducts();
    });
  });

  document.getElementById('searchBtn').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  document.getElementById('sortSelect').addEventListener('change', () => {
    fetchProducts();
  });

  document.getElementById('modalCloseBtn').addEventListener('click', () => {
    document.getElementById('productModal').style.display = 'none';
  });
});

function initCartBadge() {
  const cart = JSON.parse(localStorage.getItem('fiipkart_cart') || '[]');
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.innerText = count;
}

function fetchProducts() {
  const query = document.getElementById('searchInput').value.trim();
  const sort = document.getElementById('sortSelect').value;

  let url = `/api/products?category=${encodeURIComponent(activeCategory)}&sort=${sort}`;
  if (query) url += `&search=${encodeURIComponent(query)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.products) {
        currentProducts = data.products;
        renderProducts(data.products);
      } else {
        let filtered = seedProducts;
        if (activeCategory !== 'All') filtered = filtered.filter(p => p.category === activeCategory);
        if (query) filtered = filtered.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        renderProducts(filtered);
      }
    })
    .catch(() => {
      let filtered = seedProducts;
      if (activeCategory !== 'All') filtered = filtered.filter(p => p.category === activeCategory);
      renderProducts(filtered);
    });
}

function performSearch() {
  fetchProducts();
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  const countLabel = document.getElementById('productCountLabel');
  countLabel.innerText = `Showing ${products.length} products`;
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #878787;">No items found matching your criteria.</div>`;
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${p.is_demo ? '<div class="demo-pricing-badge">Demo Price</div>' : ''}
      <div class="product-thumb-wrap">
        <img src="${p.image}" alt="${p.name}" class="product-thumb" loading="lazy">
      </div>
      <div class="product-category-tag">${p.category}</div>
      <div class="product-name" title="${p.name}">${p.name}</div>
      <div class="product-rating">
        <span>★</span><span>${p.rating || '4.2'}</span>
      </div>
      <div class="price-row">
        <span class="current-price">₹${Number(p.selling_price).toLocaleString('en-IN')}</span>
        <span class="old-price">₹${Number(p.original_price).toLocaleString('en-IN')}</span>
        <span class="discount-tag">${p.discount}% off</span>
      </div>
      <div class="card-actions">
        <button class="btn-add-cart" onclick="addToCart(${p.id})">Add to Cart</button>
        <button class="btn-view-details" onclick="openDetailsModal(${p.id})">Details</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = (currentProducts.find(p => p.id === productId) || seedProducts.find(p => p.id === productId));
  if (!product) return;

  let cart = JSON.parse(localStorage.getItem('fiipkart_cart') || '[]');
  const existing = cart.find(i => i.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      selling_price: product.selling_price,
      original_price: product.original_price,
      discount: product.discount,
      image: product.image,
      quantity: 1
    });
  }

  localStorage.setItem('fiipkart_cart', JSON.stringify(cart));
  initCartBadge();
  alert(`${product.name} added to cart!`);
}

function openDetailsModal(productId) {
  const product = (currentProducts.find(p => p.id === productId) || seedProducts.find(p => p.id === productId));
  if (!product) return;

  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px; display: flex; align-items: center; justify-content: center;">
        <img src="${product.image}" alt="${product.name}" style="max-height: 240px; max-width: 100%; object-fit: contain;">
      </div>
      <div style="flex: 1.5; min-width: 250px;">
        <h3 style="font-size: 18px; margin-bottom: 8px;">${product.name}</h3>
        <div class="product-rating" style="margin-bottom: 12px;">★ ${product.rating || '4.2'} Rating</div>
        <div class="price-row" style="margin-bottom: 14px;">
          <span class="current-price" style="font-size: 22px;">₹${Number(product.selling_price).toLocaleString('en-IN')}</span>
          <span class="old-price">₹${Number(product.original_price).toLocaleString('en-IN')}</span>
          <span class="discount-tag">${product.discount}% off</span>
        </div>
        <p style="font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
          ${product.description || 'Authentic FIipkart verified product with warranty.'}
        </p>
        <button class="btn-checkout" style="padding: 10px 20px; font-size: 14px;" onclick="addToCart(${product.id}); document.getElementById('productModal').style.display='none';">
          Add To Shopping Cart
        </button>
      </div>
    </div>
  `;
  document.getElementById('productModal').style.display = 'flex';
}
