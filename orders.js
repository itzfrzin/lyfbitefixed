document.addEventListener('DOMContentLoaded', () => {
  const ordersContainer = document.getElementById('orders-container');

  // ── Get the logged-in user, redirect if not logged in ──────────────────
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); }
    catch { return null; }
  }

  const user = getCurrentUser();
  if (!user) {
    ordersContainer.innerHTML = `
      <div class="empty-orders" style="text-align:center; padding:5rem 2rem;">
        <div style="font-size:4rem; margin-bottom:1.25rem;">🔒</div>
        <h3 style="font-size:1.6rem; font-weight:800; color:var(--ds-text-primary); margin-bottom:0.75rem;">Login to View Your Orders</h3>
        <p style="color:var(--ds-text-secondary); margin-bottom:2.5rem; max-width:360px; margin-left:auto; margin-right:auto; line-height:1.6;">
          Your orders are saved to your account. Log in to see your meal history, track delivery, and manage your plan.
        </p>
        <div style="display:flex; flex-direction:column; align-items:center; gap:1rem;">
          <a href="login.html" style="
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.95rem 2.5rem;
            background: linear-gradient(135deg, #718355, #5a7040);
            color: white;
            border-radius: 14px;
            font-size: 1.05rem;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 6px 24px rgba(113,131,85,0.35);
            transition: transform 0.2s, box-shadow 0.2s;
            letter-spacing: 0.2px;
          " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 30px rgba(113,131,85,0.45)'"
             onmouseout="this.style.transform='none';this.style.boxShadow='0 6px 24px rgba(113,131,85,0.35)'">
            🔑 Log In to My Account
          </a>
          <a href="signup.html" style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.85rem 2rem;
            border: 2px solid var(--ds-border);
            color: var(--ds-text-primary);
            border-radius: 14px;
            font-size: 0.95rem;
            font-weight: 600;
            text-decoration: none;
            transition: border-color 0.2s, background 0.2s;
          " onmouseover="this.style.borderColor='#718355';this.style.background='rgba(113,131,85,0.06)'"
             onmouseout="this.style.borderColor='var(--ds-border)';this.style.background='transparent'">
            ✨ Create Free Account
          </a>
        </div>
      </div>
    `;
    return;
  }

  // ── Per-user order key ─────────────────────────────────────────────────
  const ORDER_KEY = 'lyfbite_orders_' + (user.id || user.email);

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function renderOrders() {
    const orders = getOrders();
    orders.sort((a, b) => b.timestamp - a.timestamp);

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="empty-orders">
          <h3>No orders yet.</h3>
          <p style="color: var(--ds-text-secondary); margin-bottom: 1.5rem;">Create your first meal plan to see it here!</p>
          <a href="personalization.html" class="btn-primary">Get Started</a>
        </div>
      `;
      return;
    }

    ordersContainer.innerHTML = orders.map(order => {
      const dateStr = new Date(order.timestamp).toLocaleString();

      const itemsHtml = order.items.map(item => {
        let displayName = item.name;
        if (displayName.startsWith('Weight ')) displayName = 'Lean ' + displayName.slice(7);
        return `
          <div class="order-item">
            <span>${displayName} × ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `;
      }).join('');

      const isSubOrder = order.items && order.items.every(i => i.type === 'subscription');
      const phoneSuffix = (order.timestamp % 900000) + 100000;
      const prefixes = ['50', '52', '55', '56', '58'];
      const prefix = prefixes[order.timestamp % prefixes.length];
      const phone = `+971 ${prefix} ${Math.floor(phoneSuffix / 1000)} ${phoneSuffix % 1000}`;
      const profilePic = `https://ui-avatars.com/api/?name=Driver&background=B5C99A&color=fff&rounded=true`;

      return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <div class="order-id">Order #${order.id}</div>
              <div class="order-date">${dateStr}</div>
            </div>
            <div class="order-status">Confirmed</div>
          </div>
          <div class="order-items">
            ${itemsHtml}
            ${isSubOrder ? '' : `
            ${order.deliveryFee > 0 ? `
              <div class="order-item" style="border-top: 1px dashed var(--ds-border); margin-top: 0.5rem; padding-top: 0.5rem;">
                <span>Delivery Fee</span>
                <span>$${order.deliveryFee.toFixed(2)}</span>
              </div>
            ` : ''}`}
            ${order.discount > 0 ? `
              <div class="order-item" style="color: var(--ds-primary);">
                <span>Discount</span>
                <span>−$${order.discount.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
          <div class="order-footer">
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
            ${isSubOrder ? '' : `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${profilePic}" alt="Driver" style="width: 32px; height: 32px; border-radius: 50%;">
              <button class="contact-driver-btn" data-phone="${phone}"
                style="background: var(--ds-primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
                📞 Contact Driver
              </button>
            </div>`}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.contact-driver-btn').forEach(btn => {
      btn.addEventListener('click', () => showDriverModal(btn.getAttribute('data-phone')));
    });
  }

  function showDriverModal(phone) {
    let overlay = document.getElementById('driver-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'driver-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="driver-modal">
          <h3>🚖 Contacting Driver</h3>
          <p>Your driver is currently on their way with your fresh LyfBite meals.</p>
          <span class="phone-number" id="modal-phone"></span>
          <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">Estimated Arrival: 15-20 mins</p>
          <button class="btn-primary" id="close-modal" style="width: 100%;">Got it</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
      document.getElementById('close-modal').addEventListener('click', () => overlay.classList.remove('active'));
    }
    document.getElementById('modal-phone').textContent = phone;
    setTimeout(() => overlay.classList.add('active'), 10);
  }

  renderOrders();
});
