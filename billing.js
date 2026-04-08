document.addEventListener('DOMContentLoaded', () => {
  const form          = document.getElementById('billing-form');
  const cardFields    = document.getElementById('card-fields');
  const paymentRadios = document.querySelectorAll('input[name="payment"]');

  // ── Payment card toggle ─────────────────────────────────────────────────
  function syncCardVisibility() {
    const selected = document.querySelector('input[name="payment"]:checked')?.value;
    if (cardFields) cardFields.style.display = selected === 'card' ? 'block' : 'none';
  }
  paymentRadios.forEach(r => r.addEventListener('change', () => {
    syncCardVisibility();
    renderCart();
  }));
  syncCardVisibility();

  // Form placeholder — handled at bottom

  // ── Autofill billing form from logged-in account ───────────────────────
  function prefillFromSession() {
    const user = getSessionUser();
    if (!user) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val && !el.value) el.value = val; };
    set('first-name', user.firstName || user.first_name || '');
    set('last-name',  user.lastName  || user.last_name  || '');
    set('email',      user.email     || '');
    set('phone',      user.phone     || user.phoneNumber || '');
    set('address1',   user.address   || user.addressLine1 || '');
    set('city',       user.city      || '');
    set('area',       user.area      || '');
    set('postal',     user.postal    || user.postalCode  || '');
    // Emirate select
    if (user.emirate) {
      const em = document.getElementById('emirate');
      if (em) {
        for (let opt of em.options) {
          if (opt.value === user.emirate || opt.text.toLowerCase().includes(user.emirate.toLowerCase())) {
            em.value = opt.value; break;
          }
        }
      }
    }
  }
  prefillFromSession();

  // ── Detect Plus user (existing yearly subscriber) ─────────────────────
  function getSessionUser() {
    try { return JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch { return null; }
  }
  function isPlusUser() {
    const u = getSessionUser();
    // Both monthly and yearly subscribers are Plus members
    return !!(u && (u.isYearlySubscriber || u.isMonthlySubscriber));
  }

  // ── Cart logic ──────────────────────────────────────────────────────────
  function getCart() {
    try {
      const raw = JSON.parse(localStorage.getItem('lyfbite_cart') || '[]');
      return raw.filter(item => item && item.name && typeof item.price === 'number' && item.price > 0 && (item.price < 500 || item.type === 'subscription'));
    }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem('lyfbite_cart', JSON.stringify(cart));
  }

  // Discount rates, order multipliers, delivery fee
  const DISCOUNTS   = { 'one-time': 0,  'weekly': 0.15, 'monthly': 0.25 };
  const MULTIPLIERS = { 'one-time': 1,  'weekly': 7,    'monthly': 30   };
  const DELIVERY    = 1.00; // $1 per order period

  // Promo codes: type = 'percent' | 'free_delivery' | 'snack'
  // once_per_user: true means the coupon can only be used once per account
  const PROMO_CODES = {
    'FIRST30':   { label: '30% off – First Order',       type: 'percent',       value: 0.30, minOrder: 0, once_per_user: true  },
    'PLUS15':    { label: '15% off – Plus Member Perk',  type: 'percent',       value: 0.15, minOrder: 0, once_per_user: false, plus_only: true },
    'FREESHIP':  { label: 'Free Delivery',                type: 'free_delivery', value: 0,    minOrder: 0, once_per_user: true  },
    'SNACKFREE': { label: 'Free Snack Pack (>$55)',       type: 'snack',         value: 5.00, minOrder: 55, once_per_user: false }
  };
  let appliedPromo = null;

  // Helper function to check if a one-time coupon has been used
  function hasCouponBeenUsed(couponCode) {
    let sessionUser = null;
    try { sessionUser = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
    if (!sessionUser) return false;
    
    const usedCouponsKey = 'lyfbite_used_coupons_' + (sessionUser.id || sessionUser.email);
    const usedCoupons = JSON.parse(localStorage.getItem(usedCouponsKey) || '[]');
    return usedCoupons.includes(couponCode);
  }

  // Helper function to mark a one-time coupon as used
  function markCouponAsUsed(couponCode) {
    let sessionUser = null;
    try { sessionUser = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
    if (!sessionUser) return;
    
    const usedCouponsKey = 'lyfbite_used_coupons_' + (sessionUser.id || sessionUser.email);
    const usedCoupons = JSON.parse(localStorage.getItem(usedCouponsKey) || '[]');
    if (!usedCoupons.includes(couponCode)) {
      usedCoupons.push(couponCode);
      localStorage.setItem(usedCouponsKey, JSON.stringify(usedCoupons));
    }
  }

  function getSubscriptionFrequency() {
    const el = document.getElementById('subscription-frequency');
    return el ? el.value : 'one-time';
  }

  // ── Qty button style (dark mode safe) ──────────────────────────────────
  const QTY_BTN_STYLE = [
    'width:28px', 'height:28px', 'border-radius:50%',
    'border:2px solid var(--ds-primary)', 'background:var(--ds-surface)',
    'color:var(--ds-text-primary)', 'cursor:pointer', 'font-size:1.1rem',
    'font-weight:700', 'line-height:1', 'display:flex', 'align-items:center',
    'justify-content:center', 'flex-shrink:0'
  ].join(';');

  function renderCart() {
    const cart       = getCart();
    const orderLines = document.querySelector('.order-lines');
    if (!orderLines) return;

    const freq       = getSubscriptionFrequency();
    const discount   = DISCOUNTS[freq]   || 0;
    const multiplier = MULTIPLIERS[freq] || 1;

    let html = '';
    let subtotal = 0;

    if (cart.length === 0) {
      html = `<p class="muted" style="margin:1rem 0;">Your cart is empty. <a href="personalization.html" style="color: var(--ds-primary); font-weight: 600;">Generate a meal plan</a> to get started.</p>`;
    } else {
      cart.forEach((item, idx) => {
        const qty   = item.quantity || 1;
        const price = Number(item.price) || 0;
        const line  = price * qty;
        subtotal   += line;

        html += `
          <div class="cart-item-row" style="margin-bottom:0.85rem;border-bottom:1px solid var(--ds-border);padding-bottom:0.85rem;">
            <div style="font-size:0.88rem;font-weight:500;color:var(--ds-text-primary);word-break:break-word;margin-bottom:0.4rem;">${item.name}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;">
              <div style="display:flex;align-items:center;gap:0.4rem;">
                <button class="qty-btn" data-action="dec" data-idx="${idx}" style="${QTY_BTN_STYLE}">−</button>
                <span style="min-width:20px;text-align:center;font-weight:700;font-size:0.95rem;color:var(--ds-text-primary);">${qty}</span>
                <button class="qty-btn" data-action="inc" data-idx="${idx}" style="${QTY_BTN_STYLE}">+</button>
              </div>
              <span style="font-weight:600;font-size:0.92rem;color:var(--ds-text-primary);white-space:nowrap;">$${line.toFixed(2)}</span>
            </div>
          </div>
        `;
      });

      // ── Add Free Snack Pack line if eligible ────────────────────────────
      const isSnackEligible = (appliedPromo?.type === 'snack' && subtotal >= appliedPromo.minOrder);
      if (isSnackEligible) {
        html += `
          <div class="cart-item-row" style="margin-bottom:0.85rem;border-bottom:1px solid var(--ds-border);padding-bottom:0.85rem;">
            <div style="font-size:0.88rem;font-weight:600;color:#16a34a;margin-bottom:0.4rem;">🎁 Free Snack Pack (Bonus)</div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:0.85rem;color:var(--ds-text-secondary);">Included with SNACKFREE</span>
              <span style="font-weight:700;font-size:0.92rem;color:#16a34a;">FREE</span>
            </div>
          </div>
        `;
      }
    }

    // ── Calculations ──────────────────────────────────────────────────────
    const baseSubtotal       = subtotal; // Single day sum
    const periodSubtotal     = baseSubtotal * multiplier; // x7 or x30
    const planDiscountAmount = periodSubtotal * discount; // 15% or 25% of period cost
    const discountedBase     = periodSubtotal - planDiscountAmount;

    // Detect subscription-only cart vs food cart
    const sessionRaw = localStorage.getItem('lyfbite_session');
    let isExistingYearly = false;
    let isExistingMonthly = false;
    try {
      const sess = JSON.parse(sessionRaw || '{}');
      isExistingYearly  = sess.isYearlySubscriber  === true;
      isExistingMonthly = sess.isMonthlySubscriber === true;
    } catch {}
    const isExistingPlus    = isExistingYearly || isExistingMonthly;
    const cartHasSubOnly    = cart.length > 0 && cart.every(i => i.type === 'subscription');
    const cartHasSub        = cart.some(i => i.type === 'subscription');
    // Free delivery: existing Plus members on food orders only (not when buying the subscription itself)
    const hasPlus = !cartHasSub && isExistingPlus;
    const deliveryFee        = cart.length > 0 ? DELIVERY * multiplier : 0;
    const freeDelivery       = appliedPromo?.type === 'free_delivery' || hasPlus;
    const isSnackEligible    = (appliedPromo?.type === 'snack' && subtotal >= appliedPromo.minOrder);
    const snackCredit        = 0;

    const promoDiscount      = appliedPromo?.type === 'percent'
                                 ? discountedBase * appliedPromo.value : 0;
    
    // ── Points Redemption ───────────────────────
    let pointsDiscount = 0;
    const isPlus = isPlusUser();

    const pointsToggle = document.getElementById('points-redeem-toggle');
    if (pointsToggle && pointsToggle.checked) {
      let sessionUserForPoints = null;
      try { sessionUserForPoints = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
      const pointsKey = sessionUserForPoints ? 'lyfbite_points_' + (sessionUserForPoints.id || sessionUserForPoints.email) : 'lyfbite_points';
      const userPoints = parseInt(localStorage.getItem(pointsKey) || '0');
      if (userPoints >= 100) pointsDiscount = 10;
    }

    // COD: hidden when buying a subscription (must pay online)
    // For Plus food orders: COD allowed but $0 fee
    // For non-Plus food orders: COD with $2 fee
    const hasSubscriptionItem = cart.some(i => i.type === 'subscription');
    const isCod      = !hasSubscriptionItem && document.querySelector('input[name="payment"]:checked')?.value === 'cod';
    const codCharge  = (isCod && !isPlus) ? 2.00 : 0; // Plus members pay no COD fee
    const effectiveDelivery = (freeDelivery || cartHasSubOnly) ? 0 : deliveryFee;
    const finalTotal = Math.max(0, discountedBase - promoDiscount - pointsDiscount + effectiveDelivery + codCharge);

    // ── Points Toggle HTML (hidden for subscription carts) ─────────────────────
    let pointsHtml = '';
    let _sessionForPts = null;
    try { _sessionForPts = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
    const _ptsKey = _sessionForPts ? 'lyfbite_points_' + (_sessionForPts.id || _sessionForPts.email) : 'lyfbite_points';
    const currentPoints = parseInt(localStorage.getItem(_ptsKey) || '0');
    const cartHasSubForPoints = cart.some(i => i.type === 'subscription');
    if (!cartHasSubForPoints && currentPoints >= 100) {
      pointsHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:rgba(104,121,72,0.05);border-radius:var(--radius-md);margin:1rem 0;border:1px solid var(--ds-border);">
          <div style="font-size:0.82rem;">
            <div style="font-weight:600;color:var(--ds-text-primary);">Redeem 100 Points</div>
            <div style="color:var(--ds-text-secondary);">Balance: ${currentPoints} pts</div>
          </div>
          <label class="toggle-switch" style="transform: scale(0.8);">
            <input type="checkbox" id="points-redeem-toggle" ${pointsDiscount > 0 ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;
    }
    html += pointsHtml;

    if (pointsDiscount > 0) {
      html += `
        <div class="summary-line" style="color:#16a34a;font-size:0.82rem;margin-bottom:0.5rem;">
          <span>Points Discount</span><strong>−$${pointsDiscount.toFixed(2)}</strong>
        </div>
      `;
    }

    // ── COD Charge line ──────────────────────────────────────────────────
    if (isCod && !hasSubscriptionItem) {
      if (isPlus) {
        html += `
          <div class="summary-line" style="color:#16a34a;font-size:0.82rem;margin-bottom:0.5rem;">
            <span>COD Handling Fee</span><strong>FREE ✦</strong>
          </div>
        `;
      } else {
        html += `
          <div class="summary-line" style="color:var(--ds-text-secondary);font-size:0.82rem;margin-bottom:0.5rem;">
            <span>COD Handling Fee</span><strong>+$${codCharge.toFixed(2)}</strong>
          </div>
        `;
      }
    }

    // ── Summary lines ─────────────────────────────────────────────────────
    const freqLabels = {
      'one-time': '',
      'weekly':   'Weekly (−15%, ×7 days)',
      'monthly':  'Monthly (−25%, ×30 days)'
    };

    // Delivery line — hide entirely for subscription carts (no delivery fee for subscriptions)
    if (cart.length > 0 && !cartHasSub) {
      const deliveryLabel = freq === 'one-time' ? 'Delivery' :
                            freq === 'weekly'   ? 'Delivery (×7 days)' : 'Delivery (×30 days)';
      if (freeDelivery) {
        html += `
          <div class="summary-line" style="margin-top:0.5rem;color:#16a34a;font-size:0.82rem;">
            <span>${deliveryLabel}</span><strong>FREE ✦ Plus Benefit</strong>
          </div>
        `;
      } else {
        html += `
          <div class="summary-line" style="margin-top:0.5rem;color:var(--ds-text-secondary);font-size:0.82rem;">
            <span>${deliveryLabel}</span><strong>$${effectiveDelivery.toFixed(2)}</strong>
          </div>
        `;
      }
    }

    // Frequency discount
    if (discount > 0 && subtotal > 0) {
      html += `
        <div class="summary-line" style="color:#16a34a;font-size:0.82rem;">
          <span>${freqLabels[freq]}</span><strong>−$${planDiscountAmount.toFixed(2)}</strong>
        </div>
      `;
    }

    // Promo discount / snack credit
    if (appliedPromo && promoDiscount > 0) {
      html += `
        <div class="summary-line" style="color:#16a34a;font-size:0.82rem;">
          <span>Promo: ${appliedPromo.label}</span><strong>−$${promoDiscount.toFixed(2)}</strong>
        </div>
      `;
    }
    if (appliedPromo?.type === 'snack') {
      if (subtotal >= appliedPromo.minOrder) {
        html += `
          <div class="summary-line" style="color:#16a34a;font-size:0.82rem;">
            <span>Promo: ${appliedPromo.label}</span><strong>FREE GIFT 🎁</strong>
          </div>
        `;
      } else {
        html += `
          <div class="summary-line" style="color:#b91c1c;font-size:0.8rem;">
            <span>⚠️ SNACKFREE needs $${appliedPromo.minOrder}+ subtotal</span><strong>—</strong>
          </div>
        `;
      }
    }

    // Total
    if (cart.length > 0) {
      const totalLabel = freq === 'one-time' ? 'Total Due Today' :
                         freq === 'weekly'   ? 'Total (7 days)' : 'Total (30 days)';
      html += `
        <div class="summary-line" style="margin-top:1rem;border-top:1px solid var(--ds-border);padding-top:1rem;font-size:1.05rem;color:var(--ds-text-primary);">
          <span><strong>${totalLabel}</strong></span>
          <strong>$${finalTotal.toFixed(2)}</strong>
        </div>
      `;
    }

    orderLines.innerHTML = html;
 
    // Qty btn listeners
    orderLines.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cart2 = getCart();
        const idx   = parseInt(btn.dataset.idx);
        if (btn.dataset.action === 'inc') {
          cart2[idx].quantity = (cart2[idx].quantity || 1) + 1;
        } else {
          cart2[idx].quantity = (cart2[idx].quantity || 1) - 1;
          if (cart2[idx].quantity <= 0) cart2.splice(idx, 1);
        }
        saveCart(cart2);
        renderCart();
      });
    });

    // Re-attach listener for points toggle
    document.getElementById('points-redeem-toggle')?.addEventListener('change', () => renderCart());
    // Re-apply COD rules after every render (cart contents may change)
    applyPaymentRules();
  }

  // ── Subscription panel + promo code injection ───────────────────────────
  const aside = document.querySelector('.billing-aside');
  if (aside) {
    const summaryCard = aside.querySelector('.order-summary');
    if (summaryCard) {
      const orderLines = summaryCard.querySelector('.order-lines');
      const plusUser   = isPlusUser();
      const cartNow    = getCart();
      const buyingPlus = cartNow.some(item => item.id === 'lyfbite_plus');

      // Hide surcharge text when buying subscription only (no actual delivery)
      const cartHasSubOnly = cartNow.length > 0 && cartNow.every(i => i.type === 'subscription');
      const surchargeEl = document.getElementById('surcharge-text');
      if (surchargeEl) surchargeEl.style.display = cartHasSubOnly ? 'none' : 'block';

      // Hide delivery address block if subscription only
      const deliveryAddressSection = document.getElementById('delivery-address-section');
      if (deliveryAddressSection) {
        deliveryAddressSection.style.display = cartHasSubOnly ? 'none' : 'block';
        const addressInputs = deliveryAddressSection.querySelectorAll('input, select, textarea');
        addressInputs.forEach(input => {
          if (cartHasSubOnly) {
             input.removeAttribute('required');
          } else {
             if (input.id !== 'postal' && input.id !== 'instructions' && input.id !== 'area') {
                input.setAttribute('required', 'true');
             }
          }
        });
      }

      // Delivery Frequency — shown for Plus users AND regular users (but NOT when cart has subscription item)
      const hasSubInCart = cartNow.some(item => item.type === 'subscription');
      if (!hasSubInCart) {
        const subSelector = document.createElement('div');
        subSelector.style.cssText = 'margin-bottom:1.25rem;';
        subSelector.innerHTML = `
          <label for="subscription-frequency" style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.5rem;color:var(--ds-text-secondary);">Delivery Frequency</label>
          <select id="subscription-frequency" style="width:100%;padding:0.65rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--ds-border);background:var(--ds-bg);color:var(--ds-text-primary);font-size:0.9rem;">
            <option value="one-time">One-time order</option>
            <option value="weekly">Weekly — 15% off × 7 days</option>
            <option value="monthly">Monthly — 25% off × 30 days</option>
          </select>
          <p style="font-size:0.78rem;color:var(--ds-text-secondary);margin-top:0.4rem;">Weekly/Monthly meals are freshly prepared &amp; delivered repeatedly.</p>
        `;
        if (orderLines) summaryCard.insertBefore(subSelector, orderLines);
        document.getElementById('subscription-frequency')?.addEventListener('change', renderCart);
      }

      // Promo code — hidden only when buying a Plus subscription; shown for all other cases (including Plus members buying food)
      if (!buyingPlus) {
        const promoBlock = document.createElement('div');
        promoBlock.style.cssText = 'margin-top:1rem;';
        promoBlock.innerHTML = `
          <label style="font-size:0.82rem;font-weight:600;color:var(--ds-text-secondary);display:block;margin-bottom:0.4rem;">Promo Code</label>
          <div style="display:flex;gap:0.5rem;">
            <input type="text" id="promo-input" placeholder="e.g. FIRST30"
              style="flex:1;padding:0.55rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--ds-border);background:var(--ds-bg);color:var(--ds-text-primary);font-size:0.88rem;text-transform:uppercase;">
            <button id="promo-apply-btn" style="padding:0.55rem 1rem;border-radius:var(--radius-md);border:none;background:var(--ds-primary);color:#fff;font-weight:600;font-size:0.88rem;cursor:pointer;">Apply</button>
          </div>
          <p id="promo-msg" style="font-size:0.78rem;margin-top:0.35rem;min-height:1rem;"></p>
        `;
        summaryCard.appendChild(promoBlock);

        // Promo apply logic
        document.getElementById('promo-apply-btn')?.addEventListener('click', () => {
          const code = (document.getElementById('promo-input')?.value || '').toUpperCase().trim();
          const msg  = document.getElementById('promo-msg');
          
          if (PROMO_CODES[code]) {
            const promoData = PROMO_CODES[code];
            
            // Check if this is a one-time coupon that has already been used
            if (promoData.once_per_user && hasCouponBeenUsed(code)) {
              appliedPromo = null;
              msg.style.color = '#b91c1c';
              msg.textContent = `❌ You've already used the "${code}" coupon. It can only be used once per account.`;
            } else if (promoData.plus_only && !isPlusUser()) {
              appliedPromo = null;
              msg.style.color = '#b91c1c';
              msg.textContent = `❌ The "${code}" coupon is exclusively for LyfBite Plus members.`;
            } else {
              appliedPromo = promoData;
              msg.style.color = '#16a34a';
              msg.textContent = `✅ "${code}" applied — ${appliedPromo.label}!`;
            }
          } else {
            appliedPromo = null;
            msg.style.color = '#b91c1c';
            msg.textContent = '❌ Invalid promo code.';
          }
          renderCart();
        });
      }


    }
  }

  // ── Final Order Submission ─────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Gate: must be logged in to place an order
      let sessionCheck = null;
      try { sessionCheck = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
      if (!sessionCheck) {
        window.location.href = 'signup.html';
        return;
      }
      
      const cart = getCart();
      if (cart.length === 0) return alert("Your cart is empty.");

      // ── Validate mandatory contact fields ──────────────────────────────────
      const firstName = document.getElementById('first-name')?.value.trim();
      const lastName = document.getElementById('last-name')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const phone = document.getElementById('phone')?.value.trim();

      const showError = (id, msg) => {
        const el = document.getElementById(id);
        if (el) {
          el.setCustomValidity(msg);
          el.reportValidity();
          el.addEventListener('input', function onInput() { el.setCustomValidity(''); el.removeEventListener('input', onInput); }, { once: true });
        }
      };
      
      if (!firstName) return showError('first-name', "Please fill out this field.");
      if (!lastName) return showError('last-name', "Please fill out this field.");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('email', "Please enter a valid email address.");
      if (!phone) return showError('phone', "Please fill out this field.");

      const cartHasSubOnlyCheck = cart.length > 0 && cart.every(i => i.type === 'subscription');

      // ── Validate mandatory address fields (skip if subscription only) ─────────
      if (!cartHasSubOnlyCheck) {
        const address1 = document.getElementById('address1')?.value.trim();
        const city = document.getElementById('city')?.value.trim();
        const emirate = document.getElementById('emirate')?.value;
        
        if (!address1) return showError('address1', 'Please fill out this field.');
        if (!city) return showError('city', 'Please fill out this field.');
        if (!emirate) return showError('emirate', 'Please select an emirate.');
      }

      // ── Validate payment method specific fields ──────────────────────────
      const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
      if (!paymentMethod) return alert("Please select a payment method.");

      // If paying by card, validate card details
      if (paymentMethod === 'card') {
        const cardName = document.getElementById('card-name')?.value.trim();
        const cardNum  = document.getElementById('card-number')?.value.trim(); // fixed ID: card-number
        const cardExp  = document.getElementById('card-exp')?.value.trim();
        const cardCvc  = document.getElementById('card-cvc')?.value.trim();

        if (!cardName) return showError('card-name', 'Please fill out this field.');
        // Strip spaces/dashes, accept 13-19 digit card numbers
        const digitsOnly = (cardNum || '').replace(/[\s\-]/g, '');
        if (!digitsOnly || digitsOnly.length < 13 || digitsOnly.length > 19 || !/^\d+$/.test(digitsOnly))
          return showError('card-number', 'Please enter a valid card number.');
        // Accept MM/YY with or without spaces around the slash
        const expClean = (cardExp || '').replace(/\s/g, '');
        if (!expClean || !/^\d{2}[/\-]?\d{2}$/.test(expClean))
          return showError('card-exp', 'Please enter a valid expiry date (MM/YY).');
        const expParts = expClean.replace(/[-]/, '/').split('/');
        const expM = parseInt(expParts[0]); const expY = parseInt(expParts[1]);
        const now = new Date();
        if (expM < 1 || expM > 12 || new Date(2000 + expY, expM - 1) < new Date(now.getFullYear(), now.getMonth()))
          return showError('card-exp', 'Your card has expired or the expiry date is invalid.');
        if (!cardCvc || !/^\d{3,4}$/.test(cardCvc.replace(/\s/g, '')))
          return showError('card-cvc', 'Please enter a valid CVC (3 or 4 digits).');
      }

      // Declare these first — used throughout
      const hasSubItem = cart.some(i => i.type === 'subscription');

      // Calculate final total for storage
      const freq = getSubscriptionFrequency();
      const multiplier = MULTIPLIERS[freq] || 1;
      const discount = DISCOUNTS[freq] || 0;
      let subtotal = 0;
      cart.forEach(i => subtotal += i.price * (i.quantity || 1));

      const periodSubtotal = subtotal * multiplier;
      const planDiscount = periodSubtotal * discount;
      let _sessData = {};
      try { _sessData = JSON.parse(localStorage.getItem('lyfbite_session') || '{}'); } catch {}
      const isExistingPlusSub = !!(_sessData.isYearlySubscriber || _sessData.isMonthlySubscriber);
      const freeShip = appliedPromo?.type === 'free_delivery'
        || (!hasSubItem && isExistingPlusSub); // Free delivery for Plus on food orders
      const delivery = (freeShip || hasSubItem) ? 0 : (DELIVERY * multiplier);

      let promoDisc = (appliedPromo?.type === 'percent') ? (periodSubtotal - planDiscount) * appliedPromo.value : 0;

      let pointsDisc = 0;
      const pt = document.getElementById('points-redeem-toggle');
      if (pt && pt.checked) {
        pointsDisc = 10;
        let _su2 = null;
        try { _su2 = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
        const _pk2 = _su2 ? 'lyfbite_points_' + (_su2.id || _su2.email) : 'lyfbite_points';
        let p = parseInt(localStorage.getItem(_pk2) || '0');
        localStorage.setItem(_pk2, Math.max(0, p - 100));
      }

      const isCod = !hasSubItem && document.querySelector('input[name="payment"]:checked')?.value === 'cod';
      const codCharge = (isCod && !isPlusUser()) ? 2.00 : 0; // Plus: COD is free
      const totalValue = Math.max(0, periodSubtotal - planDiscount - promoDisc - pointsDisc + delivery + codCharge);

      // Create Order
      const order = {
        id: Math.floor(Math.random() * 9000000) + 1000000,
        timestamp: Date.now(),
        items: cart,
        total: totalValue,
        deliveryFee: delivery,
        codCharge: codCharge,
        discount: planDiscount + promoDisc + pointsDisc,
        frequency: freq
      };

      // Save order under per-user key so different accounts don't share orders
      let sessionUser = null;
      try { sessionUser = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
      const orderKey = sessionUser ? 'lyfbite_orders_' + (sessionUser.id || sessionUser.email) : 'lyfbite_orders_guest';
      const orders = JSON.parse(localStorage.getItem(orderKey) || '[]');
      orders.push(order);
      localStorage.setItem(orderKey, JSON.stringify(orders));

      // ── Mark one-time coupons as used ──────────────────────────────────────
      if (appliedPromo && appliedPromo.once_per_user) {
        // Find the applied promo code by matching the label
        for (const [code, promoData] of Object.entries(PROMO_CODES)) {
          if (promoData.label === appliedPromo.label && promoData.once_per_user) {
            markCouponAsUsed(code);
            break;
          }
        }
      }

      // Add points — 1 point per $1 spent on food (exclude Plus subscription items)
      let _suPts = null;
      try { _suPts = JSON.parse(localStorage.getItem('lyfbite_session') || 'null'); } catch {}
      const _pkAdd = _suPts ? 'lyfbite_points_' + (_suPts.id || _suPts.email) : 'lyfbite_points';
      let curPoints = parseInt(localStorage.getItem(_pkAdd) || '0');
      // Only count food item cost (not subscription, delivery, COD fees)
      const foodSpend = cart
        .filter(i => i.type !== 'subscription')
        .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
      const earnedPoints = Math.round(foodSpend * multiplier * (1 - discount));
      localStorage.setItem(_pkAdd, curPoints + earnedPoints);

      // ── Grant Plus badge ONLY after successful payment ──────────────────
      const hasYearlyPlusInCart  = cart.some(i => i.id === 'lyfbite_plus' && i.type === 'subscription' && (i.name || '').includes('Yearly'));
      const hasMonthlyPlusInCart = cart.some(i => i.id === 'lyfbite_plus' && i.type === 'subscription' && (i.name || '').includes('Monthly'));
      if (typeof lyfbiteAuth !== 'undefined') {
        if (hasYearlyPlusInCart)  await lyfbiteAuth.setYearlySubscriber();
        if (hasMonthlyPlusInCart) await lyfbiteAuth.setMonthlySubscriber();
      }

      // Success flow
      const modal = document.createElement('div');
      modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(10px);`;
      const isSubCart = cart.some(i => i.type === 'subscription');
      const subName = isSubCart ? (cart.find(i => i.type === 'subscription')?.name || 'LyfBite Plus') : '';
      modal.innerHTML = isSubCart ? `
        <div style="background:var(--ds-surface);padding:3rem;border-radius:var(--radius-lg);text-align:center;max-width:420px;border:1px solid var(--ds-border);">
          <div style="font-size:4rem;margin-bottom:1rem;">✦</div>
          <h2 style="color:#B8860B;margin-bottom:1rem;">You Have Successfully Subscribed!</h2>
          <p style="color:var(--ds-text-secondary);margin-bottom:0.5rem;">Welcome to <strong>${subName}</strong>.</p>
          <p style="color:var(--ds-text-secondary);margin-bottom:2rem;">Your exclusive benefits are now active. Enjoy free delivery, priority support, and more.</p>
          <button id="ok-btn" class="btn-primary" style="width:100%;background:linear-gradient(135deg,#D4AF37,#B8860B);color:#fff;">Start Exploring</button>
        </div>
      ` : `
        <div style="background:var(--ds-surface);padding:3rem;border-radius:var(--radius-lg);text-align:center;max-width:400px;border:1px solid var(--ds-border);">
          <div style="font-size:4rem;margin-bottom:1rem;">🥗 SUCCESS</div>
          <h2 style="color:var(--ds-primary);margin-bottom:1rem;">Order Placed!</h2>
          <p style="color:var(--ds-text-secondary);margin-bottom:2rem;">Your personalized meals are on the way.</p>
          <button id="ok-btn" class="btn-primary" style="width:100%;">View My Orders</button>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('ok-btn').onclick = () => {
        localStorage.removeItem('lyfbite_cart');
        window.location.href = 'orders.html';
      };
    });
  }

  // ── Hide COD for Plus users OR if cart has any subscription item ────────
  function shouldHideCOD() {
    // Only hide COD when purchasing a subscription (must pay online)
    // Plus users CAN use COD for food, just no fee
    const cart = getCart();
    return cart.some(i => i.type === 'subscription');
  }

  function applyPaymentRules() {
    const hideCod = shouldHideCOD();
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
      if (radio.value === 'cod') {
        const label = radio.closest('label') || radio.parentElement;
        if (label) label.style.display = hideCod ? 'none' : '';
      }
    });
    // If COD is hidden but was selected, switch to card
    if (hideCod) {
      const codRadio = document.querySelector('input[name="payment"][value="cod"]');
      if (codRadio && codRadio.checked) {
        const cardRadio = document.querySelector('input[name="payment"][value="card"]');
        if (cardRadio) { cardRadio.checked = true; syncCardVisibility(); }
      }
    }
  }

  applyPaymentRules();

  // Initial render
  renderCart();
});
