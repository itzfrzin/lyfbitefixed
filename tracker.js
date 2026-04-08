document.addEventListener("DOMContentLoaded", () => {
  const PREFS_KEY = "lyfbite-prefs-v1";
  const TRACK_KEY = "lyfbite-tracker-v1";

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // ignore
    }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function setRingProgress(root, progress01) {
    const circle = root.querySelector(".ring-fg");
    if (!circle) return;
    const r = 46;
    const c = 2 * Math.PI * r;
    circle.style.strokeDasharray = `${c} ${c}`;
    circle.style.strokeDashoffset = `${c * (1 - clamp(progress01, 0, 1))}`;
  }

  function readPrefs() {
    return loadJson(PREFS_KEY, null);
  }

  function initTrackerState() {
    const prefs = readPrefs();
    const tKey = todayKey();
    const state = loadJson(TRACK_KEY, {
      days: {},
      streaks: { cal: 0, water: 0 },
      lastCompleted: { cal: null, water: null },
    });

    state.days[tKey] = state.days[tKey] || {
      calGoal: prefs?.caloricGoal ? Math.round(prefs.caloricGoal) : 2200,
      calConsumed: 0,
      waterGoal: 2500,
      waterConsumed: 0,
    };

    return { state, tKey };
  }

  function updateStreak(state, kind) {
    const last = state.lastCompleted?.[kind];
    const today = todayKey();
    if (last === today) return;

    if (!last) {
      state.streaks[kind] = 1;
      state.lastCompleted[kind] = today;
      return;
    }

    const lastDate = new Date(last + "T00:00:00");
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    const nextKey = nextDate.toISOString().slice(0, 10);

    if (nextKey === today) {
      state.streaks[kind] = (state.streaks[kind] || 0) + 1;
    } else {
      state.streaks[kind] = 1;
    }
    state.lastCompleted[kind] = today;
  }

  function bindCalories({ state, tKey }) {
    const day = state.days[tKey];

    const elGoal = document.getElementById("cal-goal");
    const elConsumed = document.getElementById("cal-consumed");
    const goalBadge = document.getElementById("cal-goal-badge");
    const consumedBadge = document.getElementById("cal-consumed-badge");
    const goalLabel = document.getElementById("cal-goal-label");
    const consumedLabel = document.getElementById("cal-consumed-label");
    const remainingLabel = document.getElementById("cal-remaining-label");
    const streakLabel = document.getElementById("cal-streak-label");
    const resetBtn = document.getElementById("cal-reset");
    const markBtn = document.getElementById("cal-mark");
    const ringRoot = document.querySelector('[data-ring="cal"]');

    const dateLabel = document.getElementById("cal-date");
    if (dateLabel) dateLabel.textContent = tKey;

    function sync() {
      elGoal.value = String(day.calGoal);
      elConsumed.max = String(Math.max(4500, day.calGoal));
      elConsumed.value = String(day.calConsumed);

      goalBadge.textContent = String(day.calGoal);
      consumedBadge.textContent = String(day.calConsumed);
      goalLabel.textContent = String(day.calGoal);
      consumedLabel.textContent = String(day.calConsumed);

      const remaining = Math.max(0, day.calGoal - day.calConsumed);
      remainingLabel.textContent = String(remaining);
      streakLabel.textContent = String(state.streaks?.cal || 0);

      setRingProgress(ringRoot, day.calGoal > 0 ? day.calConsumed / day.calGoal : 0);
    }

    elGoal.addEventListener("input", () => {
      day.calGoal = clamp(parseInt(elGoal.value, 10) || 2200, 1200, 4500);
      day.calConsumed = clamp(day.calConsumed, 0, Math.max(4500, day.calGoal));
      saveJson(TRACK_KEY, state);
      sync();
    });

    elConsumed.addEventListener("input", () => {
      day.calConsumed = clamp(parseInt(elConsumed.value, 10) || 0, 0, Math.max(4500, day.calGoal));
      saveJson(TRACK_KEY, state);
      sync();
    });

    resetBtn.addEventListener("click", () => {
      day.calConsumed = 0;
      saveJson(TRACK_KEY, state);
      sync();
    });

    markBtn.addEventListener("click", () => {
      updateStreak(state, "cal");
      saveJson(TRACK_KEY, state);
      sync();
    });

    sync();
  }

  function bindWater({ state, tKey }) {
    const day = state.days[tKey];
    const isImperial = localStorage.getItem('lyfbite_units') === 'imperial';

    // Conversion helpers: storage is always ml
    const ML_TO_OZ = 0.033814;
    function toDisplay(ml) { return isImperial ? Math.round(ml * ML_TO_OZ) : ml; }
    function fromDisplay(val) { return isImperial ? Math.round(val / ML_TO_OZ) : val; }
    const unit = isImperial ? 'oz' : 'ml';

    const elGoal = document.getElementById("water-goal");
    const elConsumed = document.getElementById("water-consumed");
    const goalBadge = document.getElementById("water-goal-badge");
    const consumedBadge = document.getElementById("water-consumed-badge");
    const goalLabel = document.getElementById("water-goal-label");
    const consumedLabel = document.getElementById("water-consumed-label");
    const remainingLabel = document.getElementById("water-remaining-label");
    const streakLabel = document.getElementById("water-streak-label");
    const resetBtn = document.getElementById("water-reset");
    const markBtn = document.getElementById("water-mark");
    const ringRoot = document.querySelector('[data-ring="water"]');

    // Update unit labels in the DOM to oz/ml
    document.querySelectorAll('.ring-sub').forEach(el => {
      if (el.textContent.trim() === 'ml' || el.textContent.trim() === 'oz') el.textContent = unit;
    });
    document.querySelectorAll('.metric-value').forEach(el => {
      if (el.textContent.includes(' ml') || el.textContent.includes(' oz')) {
        el.innerHTML = el.innerHTML.replace(/ ml| oz/, ` ${unit}`);
      }
    });

    // Update +add water buttons label and data
    if (isImperial) {
      const addMap = { 250: 8, 500: 17, 750: 25 }; // approx oz equivalents
      document.querySelectorAll('[data-add-water]').forEach(btn => {
        const original = parseInt(btn.getAttribute('data-add-water'), 10);
        btn.setAttribute('data-add-water', String(original)); // keep ml internally
        btn.textContent = `+${addMap[original] || Math.round(original * ML_TO_OZ)} oz`;
      });
    }

    // Update slider range to display units
    const displayGoalMax = toDisplay(5000);
    elGoal.min = String(toDisplay(1200));
    elGoal.max = String(displayGoalMax);
    elGoal.step = String(toDisplay(100));
    elConsumed.min = '0';
    elConsumed.max = String(displayGoalMax);
    elConsumed.step = String(toDisplay(50));

    function sync() {
      const dispGoal = toDisplay(day.waterGoal);
      const dispConsumed = toDisplay(day.waterConsumed);
      const dispRemaining = Math.max(0, dispGoal - dispConsumed);

      elGoal.value = String(dispGoal);
      elConsumed.max = String(Math.max(displayGoalMax, dispGoal));
      elConsumed.value = String(dispConsumed);

      goalBadge.textContent = `${dispGoal}`;
      consumedBadge.textContent = `${dispConsumed}`;
      goalLabel.textContent = `${dispGoal}`;
      consumedLabel.textContent = `${dispConsumed}`;
      remainingLabel.textContent = `${dispRemaining}`;
      streakLabel.textContent = String(state.streaks?.water || 0);

      setRingProgress(ringRoot, day.waterGoal > 0 ? day.waterConsumed / day.waterGoal : 0);
    }

    elGoal.addEventListener("input", () => {
      day.waterGoal = clamp(fromDisplay(parseInt(elGoal.value, 10) || 2500), 1200, 5000);
      day.waterConsumed = clamp(day.waterConsumed, 0, day.waterGoal);
      saveJson(TRACK_KEY, state);
      sync();
    });

    elConsumed.addEventListener("input", () => {
      day.waterConsumed = clamp(fromDisplay(parseInt(elConsumed.value, 10) || 0), 0, day.waterGoal);
      saveJson(TRACK_KEY, state);
      sync();
    });

    document.querySelectorAll("[data-add-water]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const add = parseInt(btn.getAttribute("data-add-water") || "0", 10);
        day.waterConsumed = clamp(day.waterConsumed + add, 0, Math.max(5000, day.waterGoal));
        saveJson(TRACK_KEY, state);
        sync();
      });
    });

    resetBtn.addEventListener("click", () => {
      day.waterConsumed = 0;
      saveJson(TRACK_KEY, state);
      sync();
    });

    markBtn.addEventListener("click", () => {
      updateStreak(state, "water");
      saveJson(TRACK_KEY, state);
      sync();
    });

    sync();
  }

  function setStatus(msg, kind = "info") {
    const el = document.getElementById("mealgen-status");
    if (!el) return;
    el.className = `mealgen-status ${kind}`;
    el.textContent = msg;
  }

  function mapPrefsToSpoonQuery(prefs) {
    const dietMap = {
      standard: "",
      vegetarian: "vegetarian",
      vegan: "vegan",
      keto: "ketogenic",
      highprotein: "",
    };

    const intolerances = Array.isArray(prefs?.allergens)
      ? prefs.allergens
          .map((a) => String(a).trim())
          .filter(Boolean)
          .slice(0, 8)
          .join(",")
      : "";

    const diet = dietMap[prefs?.diet] ?? "";
    const target = prefs?.caloricGoal ? Math.round(prefs.caloricGoal) : 2200;
    const perMeal = Math.round(target / Math.max(2, prefs?.mealsPerDay || 3));

    return { diet, intolerances, perMeal };
  }

  async function fetchMeals() {
    const prefs = readPrefs();
    const { diet, intolerances, perMeal } = mapPrefsToSpoonQuery(prefs);

    const mealType =
      document.querySelector('input[name="meal-type"]:checked')?.value || "dinner";
    const preferQuick = document.getElementById("filter-quick")?.checked;

    setStatus("Fetching meal ideas…", "info");

    const minCals = Math.max(150, perMeal - 200);
    const maxCals = perMeal + 200;

    const params = new URLSearchParams({
      number: "6",
      type: mealType,
      minCalories: String(minCals),
      maxCalories: String(maxCals),
      preferQuick: preferQuick ? "1" : "0",
    });
    if (diet) params.set("diet", diet);
    if (intolerances) params.set("intolerances", intolerances);

    const url = `/api/generate-meal-idea?${params.toString()}`;

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      data = await res.json();
    } catch (e) {
      setStatus("Couldn’t fetch meals. Make sure the local server is running.", "error");
      return;
    }

    const results = Array.isArray(data?.items) ? data.items : [];
    if (results.length === 0) {
      setStatus("No matches found for your filters. Try widening calories or disabling quick recipes.", "warn");
      renderMeals([]);
      return;
    }

    setStatus(`Showing ${results.length} options within your preferences.`, "ok");
    renderMeals(results);
  }

  function renderMeals(results) {
    const root = document.getElementById("meal-cards");
    if (!root) return;
    root.innerHTML = "";

    results.forEach((r) => {
      const cal = typeof r.calories === "number" ? Math.round(r.calories) : null;
      const card = document.createElement("article");
      card.className = "meal-card";

      card.innerHTML = `
        <div class="meal-thumb">
          ${r.image ? `<img src="${r.image}" alt="${r.name}">` : ""}
        </div>
        <div class="meal-body">
          <div class="meal-title">${r.name || "LyfBite meal option"}</div>
          <div class="meal-meta">
            <span>Delivered chilled</span>
            ${typeof r.deliveryWindow === "string" ? `<span>${r.deliveryWindow}</span>` : ""}
            ${cal !== null ? `<span><strong>${cal}</strong> kcal</span>` : ""}
          </div>
          <div class="meal-cta-row">
            <button class="btn-secondary outline small-btn" type="button" data-add-to-plan="${r.id || ""}">Add to plan</button>
            <button class="btn-primary small-btn" type="button" data-add-cal="${cal || 0}">Log calories</button>
          </div>
        </div>
      `;

      root.appendChild(card);
    });

    root.querySelectorAll("[data-add-to-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.textContent = "Added";
        btn.setAttribute("disabled", "true");
        setStatus("Added to your plan (demo). Connect checkout/cart to persist selections.", "ok");
      });
    });

    // Logging interaction: adds calories into today's slider
    root.querySelectorAll("[data-add-cal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const add = parseInt(btn.getAttribute("data-add-cal") || "0", 10);
        const { state, tKey } = initTrackerState();
        const day = state.days[tKey];
        day.calConsumed = clamp(day.calConsumed + Math.max(0, add), 0, Math.max(4500, day.calGoal));
        saveJson(TRACK_KEY, state);
        // reflect in UI
        const el = document.getElementById("cal-consumed");
        if (el) {
          el.value = String(day.calConsumed);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  function bindMealGen() {
    const genBtn = document.getElementById("gen-meals");

    genBtn?.addEventListener("click", fetchMeals);

    document.querySelectorAll('input[name="meal-type"]').forEach((r) =>
      r.addEventListener("change", fetchMeals)
    );
    document.getElementById("filter-quick")?.addEventListener("change", fetchMeals);
  }

  const init = initTrackerState();
  bindCalories(init);
  bindWater(init);
  bindMealGen();
  setStatus("Tip: generate meals and click “Log calories” to add them to today’s intake.", "info");
});

