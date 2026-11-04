let currentOrderDetails = null;

document.addEventListener('DOMContentLoaded', () => {
  const cart = JSON.parse(localStorage.getItem('fiipkart_cart') || '[]');
  if (cart.length === 0) {
    window.location.href = 'index.html';
    return;
  }
  const total = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
  document.getElementById('paymentTotalAmount').innerText = `₹${total.toLocaleString('en-IN')}`;
});

function processPayment() {
  const cart = JSON.parse(localStorage.getItem('fiipkart_cart') || '[]');
  const selectedMethod = document.querySelector('input[name="payMethod"]:checked').value;
  const payBtn = document.getElementById('initiatePayBtn');
  const statusBox = document.getElementById('paymentStatusBox');
  const title = document.getElementById('paymentStatusTitle');
  const desc = document.getElementById('paymentStatusDesc');
  const actionContainer = document.getElementById('upiActionContainer');

  payBtn.disabled = true;
  payBtn.innerText = 'Creating Secure Payment Request...';

  fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartItems: cart,
      paymentMethod: selectedMethod,
      customerDetails: {
        name: 'FIipkart Customer',
        phone: '+91 9876543210',
        address: 'Bangalore, India'
      }
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert(data.message || 'Error initializing transaction');
      payBtn.disabled = false;
      payBtn.innerText = 'Proceed to Pay Securely';
      return;
    }

    currentOrderDetails = data;
    statusBox.style.display = 'block';
    title.innerText = 'UPI Intent Generated';
    desc.innerText = `Order ID: ${data.orderId} | Total: ₹${data.totalAmount.toLocaleString('en-IN')}`;

    actionContainer.innerHTML = `
      <div style="margin: 16px 0;">
        <p style="font-size: 13px; margin-bottom: 12px; color: #374151;">Click below to pay via UPI:</p>
        <a href="${data.upiIntentUrl}" class="btn-checkout" style="display: inline-block; padding: 10px 24px; text-decoration: none; width: auto; margin-right: 8px;">
          Open Compatible UPI App
        </a>
        <button onclick="simulateServerPaymentVerification('${data.orderId}', '${data.transactionRef}')" class="btn-add-cart" style="padding: 10px 20px;">
          Confirm Bank Settlement
        </button>
      </div>
      <div style="font-size: 12px; color: #6b7280;">Merchant UPI: <strong>${data.merchantUpi}</strong></div>
    `;
  })
  .catch(() => {
    alert('Server unreachable. Please check backend connection.');
    payBtn.disabled = false;
    payBtn.innerText = 'Proceed to Pay Securely';
  });
}

function simulateServerPaymentVerification(orderId, txnRef) {
  const statusBox = document.getElementById('paymentStatusBox');
  const title = document.getElementById('paymentStatusTitle');
  const desc = document.getElementById('paymentStatusDesc');
  const actionContainer = document.getElementById('upiActionContainer');

  title.innerText = 'Verifying Transaction with Gateway...';
  desc.innerText = 'Please do not refresh the screen.';

  fetch('/api/orders/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, transactionRef: txnRef })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && res.paymentStatus === 'PAID') {
      localStorage.removeItem('fiipkart_cart');
      title.innerText = 'Payment Successful! ✓';
      title.style.color = '#388e3c';
      desc.innerText = `Your order ${orderId} has been confirmed!`;
      actionContainer.innerHTML = `
        <a href="index.html" class="btn-checkout" style="display: inline-block; width: auto; padding: 10px 24px; text-decoration: none;">
          Continue Shopping
        </a>
      `;
    } else {
      title.innerText = 'Payment Pending / Failed';
      title.style.color = '#d32f2f';
      desc.innerText = 'Payment verification incomplete.';
    }
  });
}
