document.addEventListener('DOMContentLoaded', () => {
    const mealDataRaw = localStorage.getItem('checkout_meal');
    const container = document.getElementById('checkout-container');
    const standardInfo = document.getElementById('standard-info');

    if (mealDataRaw && container) {
        try {
            const meal = JSON.parse(mealDataRaw);
            
            // Render the checkout UI
            container.style.display = 'block';
            
            container.innerHTML = `
                <div style="background: var(--ds-surface); border: 2px solid var(--ds-primary); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
                    <h2 style="color: var(--ds-text-primary); margin-bottom: 1rem;">Complete Your Order</h2>
                    <p style="color: var(--ds-text-secondary); margin-bottom: 2rem;">You selected <strong>${meal.mealName}</strong> from your AI personalization plan.</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                        
                        <!-- Option A: One Time -->
                        <div style="border: 1px solid var(--ds-border); border-radius: var(--radius-md); padding: 1.5rem; display: flex; flex-direction: column;">
                            <h3 style="color: var(--ds-text-primary); margin-bottom: 0.5rem;">One-Time Purchase</h3>
                            <p style="color: var(--ds-text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; flex-grow: 1;">Buy the current meal you generated and have it delivered by tomorrow.</p>
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--ds-primary); margin-bottom: 1rem;">${meal.price} Dhs</div>
                            <button id="buy-one-btn" class="btn-primary" style="width: 100%; border: none; padding: 0.75rem; cursor: pointer; font-weight: 600;">Add to Cart</button>
                        </div>

                        <!-- Option B: Subscription -->
                        <div style="border: 1px solid var(--ds-primary); border-radius: var(--radius-md); padding: 1.5rem; background: rgba(104, 121, 72, 0.05); display: flex; flex-direction: column; position: relative;">
                            <div style="position: absolute; top: -12px; right: 1rem; background: var(--ds-primary); color: white; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: bold;">BEST VALUE</div>
                            <h3 style="color: var(--ds-text-primary); margin-bottom: 0.5rem;">Weekly Plan</h3>
                            <p style="color: var(--ds-text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; flex-grow: 1;">Get 5 similar meals delivered weekly based on your exact AI macro preferences.</p>
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--ds-primary); margin-bottom: 1rem;">199 Dhs <span style="font-size: 0.8rem; font-weight: normal; color: var(--ds-text-secondary);">/ week</span></div>
                            <button id="buy-sub-btn" class="btn-primary" style="width: 100%; border: none; padding: 0.75rem; cursor: pointer; font-weight: 600;">Subscribe to Cart</button>
                        </div>

                    </div>
                </div>
            `;

            document.getElementById('buy-one-btn').addEventListener('click', () => {
                addToCartAndCheckout({
                    id: 'meal-single-' + Date.now(),
                    name: meal.mealName + " (Single Meal)",
                    price: meal.price,
                    type: 'one-time'
                });
            });

            document.getElementById('buy-sub-btn').addEventListener('click', () => {
                addToCartAndCheckout({
                    id: 'meal-sub-' + Date.now(),
                    name: "AI Weekly Personalization Plan",
                    price: 199,
                    type: 'subscription'
                });
            });

        } catch (e) {
            console.error("Invalid meal data in checkout.", e);
        }
    }

    function addToCartAndCheckout(item) {
        // Fetch existing cart
        const cartRaw = localStorage.getItem('lyfbite_cart');
        let cart = [];
        if (cartRaw) {
            try {
                cart = JSON.parse(cartRaw);
            } catch (e) { cart = []; }
        }

        // Make sure it's an array for generic products just in case
        if (!Array.isArray(cart)) cart = [];

        // Push new item and save
        cart.push(item);
        localStorage.setItem('lyfbite_cart', JSON.stringify(cart));
        
        // Clear checkout_meal so returning to delivery page resets
        localStorage.removeItem('checkout_meal');
        
        // Reroute to billing
        window.location.href = 'billing.html';
    }
});
