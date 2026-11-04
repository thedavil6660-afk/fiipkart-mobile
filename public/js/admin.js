const token = localStorage.getItem('fiipkart_admin_token');

if (!token) {
  window.location.href = 'admin-login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdminProducts();
  loadAdminOrders();
  loadUpiSettings();

  document.getElementById('upiSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const upi = document.getElementById('merchantUpiInput').value.trim();
    const name = document.getElementById('merchantNameInput').value.trim();
    const enabled = document.getElementById('upiActiveToggle').checked ? 1 : 0;

    fetch('/api/admin/settings/upi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ merchant_upi: upi, merchant_name: name, upi_gateway_enabled: enabled })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) alert('UPI configuration updated successfully.');
    });
  });
});

function switchTab(tabId, btn) {
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

function logoutAdmin() {
  localStorage.removeItem('fiipkart_admin_token');
  localStorage.removeItem('fiipkart_admin_name');
  window.location.href = 'admin-login.html';
}

function loadAdminProducts() {
  fetch('/api/admin/products', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) return;
    const tbody = document.getElementById('adminProductsTable');
    tbody.innerHTML = '';
    data.products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td><img src="${p.image}" style="width: 40px; height: 40px; object-fit: contain;"></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>₹${p.original_price}</td>
        <td>₹${p.selling_price}</td>
        <td>${p.discount}%</td>
        <td>${p.is_active ? '<span style="color: green; font-weight: bold;">Active</span>' : '<span style="color: red;">Inactive</span>'}</td>
        <td>
          <button onclick="deleteProduct(${p.id})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  fetch(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) loadAdminProducts();
  });
}

function loadAdminOrders() {
  fetch('/api/admin/orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) return;
    const tbody = document.getElementById('adminOrdersTable');
    tbody.innerHTML = '';
    data.orders.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${o.id}</strong></td>
        <td>${o.customer_name}<br><small>${o.customer_phone}</small></td>
        <td><pre style="font-family: inherit; font-size: 11px;">${o.items}</pre></td>
        <td><strong>₹${Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
        <td>${o.payment_method}</td>
        <td><span style="font-weight: 700; color: ${o.payment_status === 'PAID' ? 'green' : 'orange'};">${o.payment_status}</span></td>
        <td>
          <button onclick="updateOrderStatus('${o.id}', 'PAID')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-bottom: 2px;">Mark Paid</button>
          <button onclick="updateOrderStatus('${o.id}', 'REFUNDED')" style="background: #64748b; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Refund</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function updateOrderStatus(id, status) {
  fetch(`/api/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) loadAdminOrders();
  });
}

function loadUpiSettings() {
  fetch('/api/admin/settings/upi', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success || !data.config) return;
    document.getElementById('merchantUpiInput').value = data.config.merchant_upi || '';
    document.getElementById('merchantNameInput').value = data.config.merchant_name || '';
    document.getElementById('upiActiveToggle').checked = data.config.upi_gateway_enabled === '1';
  });
}

function openAddProductModal() {
  const name = prompt('Enter Product Name:');
  if (!name) return;
  const category = prompt('Enter Category (Smartphones, Laptops, Headphones, Smartwatches, Appliances, Beauty, Fashion):', 'Smartphones');
  const original_price = parseFloat(prompt('Enter Reference/Original Price (₹):', '10000'));
  const selling_price = parseFloat(prompt('Enter Selling Price (₹):', '799'));
  const image = prompt('Enter Image URL:', 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=500&q=80');
  const description = prompt('Enter Product Description:', 'High-grade brand-new inventory item.');

  fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, category, original_price, selling_price, image, description, is_demo: 0 })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Product created successfully');
      loadAdminProducts();
    }
  });
}
