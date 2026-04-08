document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  const progressBar = document.getElementById('progress-bar');

  // ── Meal Count: radio toggle + custom input ─────────────────────────────
  const mealCountRadios = document.querySelectorAll('input[name="mealCountRadio"]');
  const customWrapper  = document.getElementById('custom-count-wrapper');
  const customInput    = document.getElementById('mealCountCustom');

  mealCountRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom') {
        customWrapper.style.display = 'block';
        customInput.required = true;
      } else {
        customWrapper.style.display = 'none';
        customInput.required = false;
      }
      updateMealCountBtnStyle();
    });
  });

  function updateMealCountBtnStyle() {
    document.querySelectorAll('.meal-count-btn').forEach(lbl => {
      const inp = lbl.querySelector('input[type="radio"]');
      lbl.style.background    = inp.checked ? 'var(--ds-primary)' : 'var(--ds-surface)';
      lbl.style.color          = inp.checked ? '#fff' : 'var(--ds-text-primary)';
      lbl.style.border         = inp.checked ? '2px solid var(--ds-primary)' : '2px solid var(--ds-border)';
      lbl.style.borderRadius   = 'var(--radius-md)';
      lbl.style.padding        = '0.75rem 1rem';
      lbl.style.cursor         = 'pointer';
      lbl.style.textAlign      = 'center';
      lbl.style.fontWeight     = '600';
      lbl.style.transition     = 'all 0.2s';
      lbl.style.display        = 'flex';
      lbl.style.alignItems     = 'center';
      lbl.style.justifyContent = 'center';
      lbl.style.gap            = '0.5rem';
    });
  }
  // Initial style pass
  updateMealCountBtnStyle();

  function getSelectedMealCount() {
    const selected = document.querySelector('input[name="mealCountRadio"]:checked');
    if (!selected) return 3; // default to 3 as set in HTML
    if (selected.value === 'custom') {
      const val = parseInt(customInput?.value);
      if (isNaN(val) || val < 1) return 3;
      return Math.min(10, val);
    }
    return parseInt(selected.value) || 3;
  }

  // ── Saved data helpers ──────────────────────────────────────────────────
  const loadSavedData = () => {
    const fields = ['age', 'gender', 'weight', 'goal', 'calories', 'macros', 'diet', 'allergies'];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el && localStorage.getItem('lyfbite_' + f)) {
        el.value = localStorage.getItem('lyfbite_' + f);
      }
    });
    const savedHealth = localStorage.getItem('lyfbite_healthIssues');
    if (savedHealth) {
      const issues = JSON.parse(savedHealth);
      document.querySelectorAll('input[name="healthIssues"]').forEach(cb => {
        if (issues.includes(cb.value)) cb.checked = true;
      });
    }
  };
  loadSavedData();

  const saveData = () => {
    const fields = ['age', 'gender', 'weight', 'goal', 'calories', 'macros', 'diet', 'allergies'];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) localStorage.setItem('lyfbite_' + f, el.value);
    });
    const issues = Array.from(document.querySelectorAll('input[name="healthIssues"]:checked')).map(cb => cb.value);
    localStorage.setItem('lyfbite_healthIssues', JSON.stringify(issues));
  };

  // ── Step navigation ─────────────────────────────────────────────────────
  document.getElementById('btn-next-1')?.addEventListener('click', () => {
    const age = document.getElementById('age');
    const weight = document.getElementById('weight');
    const calories = document.getElementById('calories');
    
    if (age && !age.reportValidity()) return;
    if (weight && !weight.reportValidity()) return;
    if (calories && !calories.reportValidity()) return;

    saveData();
    step1.classList.remove('active-step');
    step2.classList.add('active-step');
    progressBar.style.width = '50%';
  });

  document.getElementById('btn-prev-2')?.addEventListener('click', () => {
    step2.classList.remove('active-step');
    step1.classList.add('active-step');
    progressBar.style.width = '0%';
  });

  document.getElementById('btn-next-2')?.addEventListener('click', () => {
    saveData();
    step2.classList.remove('active-step');
    step3.classList.add('active-step');
    progressBar.style.width = '100%';
  });

  document.getElementById('btn-prev-3')?.addEventListener('click', () => {
    step3.classList.remove('active-step');
    step2.classList.add('active-step');
    progressBar.style.width = '50%';
  });

  // ── In-memory list of generated meals (used by Add All) ───────────────
  let generatedMeals = [];

  // ── Form submit ─────────────────────────────────────────────────────────
  const form = document.getElementById('ai-wizard-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate meal count
      const selected = document.querySelector('input[name="mealCountRadio"]:checked');
      if (!selected) {
        const firstRadio = document.querySelector('input[name="mealCountRadio"]');
        firstRadio.setCustomValidity("Please select how many meal plans you want.");
        firstRadio.reportValidity();
        return;
      } else {
        selected.setCustomValidity("");
      }

      if (selected.value === 'custom') {
        if (!customInput.reportValidity()) return;
      }

      const mealCount = getSelectedMealCount();

      const formData = new FormData(form);
      const healthIssues = Array.from(form.querySelectorAll('input[name="healthIssues"]:checked')).map(el => el.value);

      const payload = {
        mealCount,
        profile: {
          age:     formData.get('age'),
          gender:  formData.get('gender'),
          weight:  formData.get('weight'),
          goal:    formData.get('goal'),
          calories: formData.get('calories'),
          macros:  formData.get('macros')
        },
        health: {
          diet:      formData.get('diet'),
          issues:    healthIssues,
          allergies: formData.get('allergies')
        }
      };

      document.getElementById('form-container').style.display = 'none';
      document.getElementById('ai-loading').style.display     = 'block';
      document.getElementById('ai-error').style.display       = 'none';
      document.getElementById('ai-results').style.display     = 'none';
      const loadingText = document.getElementById('ai-loading-text');
      if (loadingText) loadingText.textContent = `Designing ${mealCount} personalized meal${mealCount > 1 ? 's' : ''} for you...`;

      try {
        const response = await fetch('/api/generate-meal-plan', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to generate meal plan");
        }

        const data = await response.json();

        let mealsArray = [];
        if (Array.isArray(data))                           mealsArray = data;
        else if (data.meals && Array.isArray(data.meals))  mealsArray = data.meals;
        else if (data.items && Array.isArray(data.items))  mealsArray = data.items;
        else if (data.mealName)                            mealsArray = [data];

        if (!mealsArray || mealsArray.length === 0) {
          throw new Error("No meal plans were returned. Please try again.");
        }

        generatedMeals = mealsArray;
        renderResults(mealsArray);
      } catch (err) {
        document.getElementById('ai-error').textContent = err.message;
        document.getElementById('ai-error').style.display = 'block';
        document.getElementById('form-container').style.display = 'block';
      } finally {
        document.getElementById('ai-loading').style.display = 'none';
      }
    });
  }

  // ── Cart helpers ────────────────────────────────────────────────────────
  function getCart() {
    try { return JSON.parse(localStorage.getItem('lyfbite_cart') || '[]'); }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem('lyfbite_cart', JSON.stringify(cart));
  }

  function addMealToCart(meal) {
    const cart = getCart();
    const existing = cart.find(i => i.name === meal.mealName);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({
        id:       'meal-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name:     meal.mealName,
        price:    meal.price || 12,
        quantity: 1,
        type:     'one-time'
      });
    }
    saveCart(cart);
  }

  function showCartToast(message) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; background: var(--ds-primary);
        color: #fff; padding: 0.75rem 1.5rem; border-radius: var(--radius-md);
        font-weight: 600; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  // ── Add All to Cart button ──────────────────────────────────────────────
  document.getElementById('add-all-to-cart')?.addEventListener('click', () => {
    if (!generatedMeals.length) return;
    generatedMeals.forEach(m => addMealToCart(m));
    showCartToast(`🛒 ${generatedMeals.length} meal${generatedMeals.length > 1 ? 's' : ''} added to cart!`);
  });

  // ── Render results ──────────────────────────────────────────────────────
  function renderResults(meals) {
    const grid = document.querySelector('.meals-grid');
    grid.innerHTML = '';

    let totalCals = 0, totalPro = 0, totalCarbs = 0, totalFats = 0;

    meals.forEach((meal, i) => {
      totalCals  += meal.macros?.calories || 0;
      totalPro   += meal.macros?.protein  || 0;
      totalCarbs += meal.macros?.carbs    || 0;
      totalFats  += meal.macros?.fats     || 0;

      const priceUSD = typeof meal.price === 'number' ? meal.price.toFixed(2) : '12.00';

      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--ds-surface);
        border: 1px solid var(--ds-border);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
      `;

      card.innerHTML = `
        <div style="background: rgba(104, 121, 72, 0.1); color: var(--ds-primary); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: bold; display: inline-block; margin-bottom: 1rem;">Meal ${i + 1}</div>
        <h3 style="margin-bottom: 1rem; font-size: 1.2rem; color: var(--ds-text-primary); line-height: 1.3; flex-grow: 1;">${meal.mealName}</h3>
        <p style="color: var(--ds-text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;"><span style="font-weight:600;">Prep Time:</span> ${meal.prepTime} mins</p>
        <p style="color: var(--ds-text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">${meal.instructions}</p>
        <div style="background: var(--ds-bg); padding: 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;"><strong>Calories</strong> <span>${meal.macros?.calories ?? '—'} kcal</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;"><strong>Protein</strong> <span>${meal.macros?.protein ?? '—'}g</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;"><strong>Carbs</strong> <span>${meal.macros?.carbs ?? '—'}g</span></div>
          <div style="display: flex; justify-content: space-between;"><strong>Fats</strong> <span>${meal.macros?.fats ?? '—'}g</span></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: auto;">
          <span style="font-size: 1.25rem; font-weight: 700; color: var(--ds-primary);">$${priceUSD}</span>
          <button class="add-to-cart-btn btn-primary" data-index="${i}" title="Add to Cart"
            style="display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
            🛒 Add to Cart
          </button>
        </div>
      `;

      card.querySelector('.add-to-cart-btn').addEventListener('click', function() {
        addMealToCart(meal);
        showCartToast(`✅ "${meal.mealName}" added to cart!`);
      });

      grid.appendChild(card);
    });

    // Update nutrition tracker
    document.getElementById('tracker-cals').textContent = totalCals;
    document.getElementById('tracker-pro').textContent  = totalPro  + 'g';
    document.getElementById('tracker-car').textContent  = totalCarbs + 'g';
    document.getElementById('tracker-fat').textContent  = totalFats  + 'g';

    // Add logic for Surprise Add-ons
    document.querySelectorAll('.addon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        
        const cart = getCart();
        const existing = cart.find(i => i.name === name);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          cart.push({
            id: 'addon-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: name,
            price: price,
            quantity: 1,
            type: 'one-time'
          });
        }
        saveCart(cart);
        showCartToast(`🎁 "${name}" added to cart!`);
        btn.innerHTML = 'Added! ✓';
        btn.style.background = 'var(--ds-accent)';
        btn.style.color = 'var(--ds-text-primary)';
        setTimeout(() => {
          btn.innerHTML = `+ $${price.toFixed(2)}`;
          btn.style.background = 'var(--ds-primary)';
          btn.style.color = '#fff';
        }, 2000);
      });
    });

    document.getElementById('ai-results').style.display = 'block';
  }
});
