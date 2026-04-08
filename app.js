document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentStep = 1;
    const totalSteps = 3;
    let selectedGoal = '';
    let userAllergies = [];

    // --- DOM Elements ---
    const progressBar = document.getElementById('progress-bar');
    const homeSection = document.getElementById('home-section');
    const mainFooter = document.getElementById('main-footer');
    const wizardSection = document.getElementById('wizard-section');
    const loadingSection = document.getElementById('loading-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const settingsSection = document.getElementById('settings-section');

    // Navigation Buttons
    const heroStartBtn = document.getElementById('hero-start-btn');
    const next1Btn = document.getElementById('next-1');
    const next2Btn = document.getElementById('next-2');
    const prev2Btn = document.getElementById('prev-2');
    const prev3Btn = document.getElementById('prev-3');
    const generateBtn = document.getElementById('generate-btn');
    
    // Inputs
    const goalCards = document.querySelectorAll('.card');
    const weightSlider = document.getElementById('weight');
    const weightDisplay = document.getElementById('weight-display');
    const tagsInput = document.getElementById('allergies');
    const tagsContainer = document.getElementById('tags-container');

    // Result Elements
    const planSubtitle = document.getElementById('plan-subtitle');
    const weekGrid = document.getElementById('week-grid');
    const dailyBreakdown = document.getElementById('daily-breakdown');
    const mealBlocks = document.getElementById('meal-blocks');
    const breakdownDayTitle = document.getElementById('breakdown-day-title');
    const closeBreakdownBtn = document.getElementById('close-breakdown');
    
    // Top Nav
    const navLogo = document.querySelector('.logo');
    const navHome = document.getElementById('nav-home');
    const navGetStarted = document.getElementById('nav-get-started');
    const navMyPlans = document.getElementById('nav-my-plans');
    const navSettings = document.getElementById('nav-settings');

    // Settings Inputs
    const themeToggle = document.getElementById('theme-toggle');

    // --- Actions ---

    function updateProgress() {
        const percentage = ((currentStep) / totalSteps) * 100;
        progressBar.style.width = `${percentage}%`;
        
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active-step');
        });
        
        // Show current step
        document.getElementById(`step-${currentStep}`).classList.add('active-step');
    }

    // Step 1: Goals
    goalCards.forEach(card => {
        card.addEventListener('click', () => {
            goalCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedGoal = card.getAttribute('data-value');
            next1Btn.removeAttribute('disabled');
        });
    });

    // Step Transition Handlers
    next1Btn.addEventListener('click', () => {
        if(selectedGoal) {
            currentStep = 2;
            updateProgress();
        }
    });

    prev2Btn.addEventListener('click', () => {
        currentStep = 1;
        updateProgress();
    });

    next2Btn.addEventListener('click', () => {
        currentStep = 3;
        updateProgress();
    });

    prev3Btn.addEventListener('click', () => {
        currentStep = 2;
        updateProgress();
    });

    // Dynamic Weight Slider
    weightSlider.addEventListener('input', (e) => {
        weightDisplay.textContent = `${e.target.value} kg`;
    });

    // Tags Input (Allergies)
    function renderTags() {
        tagsContainer.innerHTML = '';
        userAllergies.forEach((tag, index) => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag';
            tagEl.innerHTML = `${tag} <span data-index="${index}">&times;</span>`;
            tagsContainer.appendChild(tagEl);
        });
    }

    tagsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            const index = e.target.getAttribute('data-index');
            userAllergies.splice(index, 1);
            renderTags();
        }
    });

    tagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagsInput.value.trim();
            if (val && !userAllergies.includes(val)) {
                userAllergies.push(val);
                renderTags();
                tagsInput.value = '';
            }
        }
    });

    // Generate Flow
    generateBtn.addEventListener('click', () => {
        const diet = document.getElementById('diet').value;
        const btnText = generateBtn.querySelector('.btn-text');
        
        btnText.textContent = 'Generating...';
        generateBtn.setAttribute('disabled', 'true');

        setTimeout(() => {
            wizardSection.classList.remove('active-section');
            wizardSection.classList.add('hidden-section');
            
            loadingSection.classList.remove('hidden-section');
            loadingSection.classList.add('active-section');

            // Simulate API / Processing Wait
            setTimeout(() => {
                loadingSection.classList.remove('active-section');
                loadingSection.classList.add('hidden-section');
                
                dashboardSection.classList.remove('hidden-section');
                dashboardSection.classList.add('active-section');
                
                planSubtitle.textContent = `Personalized for ${selectedGoal} • ${diet} Diet`;
                
                // Allow direct navigation to My Plans now
                navMyPlans.classList.add('active');
                generateMockDashboard(selectedGoal, diet);

                // Update Nav Visually
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                navMyPlans.classList.add('active');

            }, 2000); // 2 sec loading
        }, 300);
    });

    // Top Navigation Simple Handlers
    function goToHome(e) {
        if(e) e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        navHome.classList.add('active');

        wizardSection.classList.add('hidden-section');
        wizardSection.classList.remove('active-section');
        dashboardSection.classList.add('hidden-section');
        dashboardSection.classList.remove('active-section');
        settingsSection.classList.add('hidden-section');
        settingsSection.classList.remove('active-section');
        
        homeSection.classList.remove('hidden-section');
        homeSection.classList.add('active-section');
        mainFooter.classList.remove('hidden-section');
    }

    if (navLogo) navLogo.addEventListener('click', goToHome);
    if (navHome) navHome.addEventListener('click', goToHome);

    function goToWizard(e) {
        if(e) e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        if (navGetStarted) navGetStarted.classList.add('active');

        homeSection.classList.add('hidden-section');
        homeSection.classList.remove('active-section');
        mainFooter.classList.add('hidden-section');
        
        dashboardSection.classList.add('hidden-section');
        dashboardSection.classList.remove('active-section');
        
        settingsSection.classList.add('hidden-section');
        settingsSection.classList.remove('active-section');
        
        wizardSection.classList.remove('hidden-section');
        wizardSection.classList.add('active-section');
        
        currentStep = 1;
        updateProgress();
    }

    if (navGetStarted) navGetStarted.addEventListener('click', goToWizard);
    // Start Your Journey -> personalization page
    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'personalization.html';
        });
    }

    if (navMyPlans) navMyPlans.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Ensure a goal is selected (plan is generated) before allowing access
        if(!selectedGoal) {
            alert("No active meal plan found! Please click 'Get Started' to generate your personalized plan first.");
            return;
        }

        // Only switch views if we are not already on the dashboard
        if(dashboardSection.classList.contains('hidden-section')) {
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');

            homeSection.classList.add('hidden-section');
            homeSection.classList.remove('active-section');
            mainFooter.classList.add('hidden-section');
            
            wizardSection.classList.add('hidden-section');
            wizardSection.classList.remove('active-section');
            
            settingsSection.classList.add('hidden-section');
            settingsSection.classList.remove('active-section');
            
            dashboardSection.classList.remove('hidden-section');
            dashboardSection.classList.add('active-section');
        }
    });

    if (navSettings) navSettings.addEventListener('click', (e) => {
        if(e) e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        navSettings.classList.add('active');

        homeSection.classList.add('hidden-section');
        homeSection.classList.remove('active-section');
        
        wizardSection.classList.add('hidden-section');
        wizardSection.classList.remove('active-section');
        
        dashboardSection.classList.add('hidden-section');
        dashboardSection.classList.remove('active-section');
        
        settingsSection.classList.remove('hidden-section');
        settingsSection.classList.add('active-section');
        
        // Ensure footer is visible on settings page
        mainFooter.classList.remove('hidden-section');
    });

    closeBreakdownBtn.addEventListener('click', () => {
        dailyBreakdown.style.display = 'none';
        document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
    });

    // --- Mock Data Generation ---

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    function generateMockDashboard(goal, diet) {
        weekGrid.innerHTML = '';
        
        const baseCalories = goal === 'Weight Loss' ? 1800 : goal === 'Muscle Gain' ? 2800 : 2200;

        days.forEach((day, i) => {
            const card = document.createElement('div');
            card.className = 'day-card';
            
            // Randomize calories a bit for realism
            const dailyCals = baseCalories + Math.floor(Math.random() * 200 - 100);

            card.innerHTML = `
                <div class="day-name">${day}</div>
                <div class="day-cal">${dailyCals} kcal</div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                showDailyBreakdown(day, goal, diet);
            });

            weekGrid.appendChild(card);
        });

        // Automatically select Monday
        weekGrid.firstChild.click();
    }

    function showDailyBreakdown(day, goal, diet) {
        breakdownDayTitle.textContent = `${day}'s Plan`;
        dailyBreakdown.style.display = 'block';
        
        // Mock Meal Content
        const mockMeals = [
            { time: 'Breakfast', title: 'Avocado Toast with Poached Egg', cals: 450, macros: { p: 20, c: 45, f: 22 } },
            { time: 'Lunch', title: 'Quinoa & Grilled Chicken Bowl', cals: 600, macros: { p: 45, c: 55, f: 18 } },
            { time: 'Snack', title: 'Greek Yogurt with Mixed Berries', cals: 200, macros: { p: 15, c: 25, f: 5 } },
            { time: 'Dinner', title: 'Baked Salmon with Roasted Asparagus', cals: 550, macros: { p: 42, c: 15, f: 30 } }
        ];

        // Tweak titles slightly based on diet to look authentic
        if(diet === 'Vegan') {
            mockMeals[0].title = 'Tofu Scramble with Spinach';
            mockMeals[1].title = 'Chickpea & Quinoa Buddha Bowl';
            mockMeals[3].title = 'Lentil Shepherd’s Pie';
        } else if (diet === 'Keto') {
            mockMeals[0].title = 'Bacon and Eggs with Avocado';
            mockMeals[1].title = 'Caesar Salad with Grilled Chicken';
            mockMeals[3].title = 'Steak with Garlic Butter Zucchini';
        }

        mealBlocks.innerHTML = '';
        mockMeals.forEach(meal => {
            const block = document.createElement('div');
            block.className = 'meal-block';
            block.innerHTML = `
                <div class="meal-content">
                    <div class="meal-time">${meal.time}</div>
                    <div class="meal-title">${meal.title}</div>
                    <div class="meal-macros">
                        <span><strong>${meal.macros.p}g</strong> Protein</span>
                        <span><strong>${meal.macros.c}g</strong> Carbs</span>
                        <span><strong>${meal.macros.f}g</strong> Fat</span>
                    </div>
                </div>
                <div class="meal-cal">${meal.cals} kcal</div>
            `;
            mealBlocks.appendChild(block);
        });
    }

    // --- Settings / Theme Initialization ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    // Run Initializers
    initTheme();
    
    // Show footer on initial load if on home page
    mainFooter.classList.remove('hidden-section');

    // Deep links from other pages (e.g. pricing → Get Started)
    if (window.location.hash === '#wizard') {
        goToWizard();
    }
    if (window.location.hash === '#settings') {
        navSettings.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

});
