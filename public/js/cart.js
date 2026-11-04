document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

function getCart() {
  return JSON.parse(localStorage.getItem('fiipkart_cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('fiipkart_cart', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const listEl = document.getElementById('cartItemsList');
  const countEl = document.getElementById('cartItemCount');
  const subtotalEl = document.getElementById('priceSubtotal');
  const discountEl = document.getElementById('discountSavings');
  const totalEl = document.getElementById('totalAmount');
  const proceedBtn = document.getElementById('proceedBtn');

  const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
  countEl.innerText = totalQty;
  listEl.innerHTML = '';

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 10px;">
        <p style="font-size: 16px; color: #878787; margin-bottom: 16px;">Your cart is currently empty!</p>
        <a href="index.html" class="btn-checkout" style="display: inline-block; width: auto; padding: 10px 24px;">Explore Catalog</a>
      </div>
    `;
    subtotalEl.innerText = '₹0';
    discountEl.innerText = '-₹0';
    totalEl.innerText = '₹0';
    proceedBtn.disabled = true;
    proceedBtn.style.opacity = '0.5';
    return;
  }

  proceedBtn.disabled = false;
  proceedBtn.style.opacity = '1';

  let totalSelling = 0;
  let totalOriginal = 0;

  cart.forEach(item => {
    const original = (item.original_price || item.selling_price) * item.quantity;
    const selling = item.selling_price * item.quantity;
    totalOriginal += original;
    totalSelling += selling;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div style="flex: 1;">
        <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">${item.name}</h4>
        <div class="price-row" style="margin-bottom: 8px;">
          <span class="current-price">₹${Number(item.selling_price).toLocaleString('en-IN')}</span>
          <span class="old-price">₹${Number(item.original_price).toLocaleString('en-IN')}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
          <span style="font-weight: 700; font-size: 14px;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
          <button style="margin-left: 20px; background: none; border: none; color: #d32f2f; font-weight: 600; cursor: pointer; font-size: 13px;" onclick="removeItem(${item.id})">
            REMOVE
          </button>
        </div>
      </div>
    `;
    listEl.appendChild(row);
  });

  const discountSavings = Math.max(0, totalOriginal - totalSelling);
  subtotalEl.innerText = `₹${totalOriginal.toLocaleString('en-IN')}`;
  discountEl.innerText = `-₹${discountSavings.toLocaleString('en-IN')}`;
  totalEl.innerText = `₹${totalSelling.toLocaleString('en-IN')}`;
}

function updateQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeItem(id);
    return;
  }
  saveCart(cart);
}

function removeItem(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
}

function proceedToPayment() {
  const cart = getCart();
  if (cart.length === 0) return;
  window.location.href = 'payment.html';
}
