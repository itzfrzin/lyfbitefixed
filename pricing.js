(function () {
  const BASE_PER_MEAL = 38;
  const DELIVERY_FLAT = 15;

  const dietMultipliers = {
    standard: 1,
    vegetarian: 1.06,
    vegan: 1.1,
    keto: 1.14,
    highprotein: 1.12,
  };

  const durationWeeks = {
    1: { label: '1 week', bulk: 1 },
    2: { label: '2 weeks', bulk: 0.94 },
    4: { label: '4 weeks', bulk: 0.88 },
  };

  function getInputs() {
    const mealsPerDay = parseInt(
      document.querySelector('input[name="meals-per-day"]:checked')?.value || '3',
      10
    );
    const daysPerWeek = parseInt(
      document.querySelector('input[name="days-per-week"]:checked')?.value || '5',
      10
    );
    const diet = document.querySelector('input[name="diet-style"]:checked')?.value || 'standard';
    const duration = parseInt(
      document.querySelector('input[name="plan-duration"]:checked')?.value || '1',
      10
    );
    const snacks = document.getElementById('opt-snacks')?.checked;
    const breakfastBoost = document.getElementById('opt-breakfast')?.checked;
    const lowSodium = document.getElementById('opt-low-sodium')?.checked;
    const organic = document.getElementById('opt-organic')?.checked;

    return {
      mealsPerDay,
      daysPerWeek,
      diet,
      duration,
      snacks,
      breakfastBoost,
      lowSodium,
      organic,
    };
  }

  function formatDhs(n) {
    return (
      new Intl.NumberFormat('en-AE', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(n)) + ' Dhs'
    );
  }

  function calculate() {
    const {
      mealsPerDay,
      daysPerWeek,
      diet,
      duration,
      snacks,
      breakfastBoost,
      lowSodium,
      organic,
    } = getInputs();

    const weeklyMeals = mealsPerDay * daysPerWeek;
    const dietMult = dietMultipliers[diet] ?? 1;
    const dur = durationWeeks[duration] || durationWeeks[1];

    let weeklySubtotal =
      weeklyMeals * BASE_PER_MEAL * dietMult;

    if (snacks) weeklySubtotal += 45;
    if (breakfastBoost) weeklySubtotal += 55;
    if (lowSodium) weeklySubtotal += weeklyMeals * 2;
    if (organic) weeklySubtotal += weeklyMeals * 5;

    if (weeklyMeals > 0) {
      weeklySubtotal += DELIVERY_FLAT;
    }

    const discountedWeekly = weeklySubtotal * dur.bulk;
    const periodTotal = discountedWeekly * duration;

    const perMealEquiv =
      weeklyMeals > 0 ? discountedWeekly / weeklyMeals : 0;

    document.getElementById('price-weekly').textContent = formatDhs(discountedWeekly);
    document.getElementById('price-period').textContent = formatDhs(periodTotal);
    document.getElementById('price-per-meal').textContent = formatDhs(perMealEquiv);
    document.getElementById('summary-meals').textContent = String(weeklyMeals);
    document.getElementById('summary-duration').textContent = dur.label;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-pricing-input]').forEach((el) => {
      el.addEventListener('change', calculate);
      el.addEventListener('input', calculate);
    });
    calculate();
  });
})();
