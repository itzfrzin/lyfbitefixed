/**
 * LyfBite Floating Chatbot
 * A lightweight FAQ chatbot widget injected on every page.
 */
(function () {
  // ── FAQ Knowledge Base ─────────────────────────────────────────────────
  const FAQ = [
    {
      patterns: ['hello', 'hi', 'hey', 'howdy', 'salaam', 'salam'],
      answer: "Hi there! 👋 I'm the LyfBite assistant. I can help with meal plans, subscriptions, delivery, rewards, and more. What would you like to know?"
    },
    {
      patterns: ['subscription', 'subscribe', 'lyfbite plus', 'plus plan', 'membership', 'monthly', 'yearly'],
      answer: "LyfBite Plus comes in two plans:\n• **Monthly** — flexible month-to-month billing\n• **Yearly** — best value, save more!\n\nBenefits include free delivery, no COD fee, priority support, and exclusive promo codes. Visit the <a href='plus.html'>Plus page</a> to upgrade! ✦"
    },
    {
      patterns: ['delivery', 'shipping', 'deliver', 'how long', 'when will'],
      answer: "We deliver across the UAE 🇦🇪 — Dubai, Abu Dhabi, Sharjah and more. Standard delivery is $1 per order. LyfBite Plus members get **free delivery** on all food orders! Check our <a href='delivery.html'>Delivery Policy</a> for details."
    },
    {
      patterns: ['promo', 'coupon', 'discount', 'code', 'offer', 'deal'],
      answer: "Here are some active codes you can use at checkout:\n• **FIRST30** — 30% off your first order\n• **FREESHIP** — free delivery on any order\n• **SNACKFREE** — free snack pack on orders $55+\n• **PLUS15** — 15% off (LyfBite Plus members only)\n\nVisit <a href='rewards.html'>Rewards</a> to copy codes!"
    },
    {
      patterns: ['points', 'reward', 'loyalty', 'earn', 'redeem'],
      answer: "You earn **1 point per $1** spent on food orders. Redeem 100 points for $10 off your next order! Points are added automatically after every purchase. Check your balance on the <a href='rewards.html'>Rewards page</a>. 🎁"
    },
    {
      patterns: ['meal plan', 'meal', 'food', 'generate', 'personalize', 'diet', 'nutrition'],
      answer: "Our AI builds a personalised meal plan based on your goals, allergies, and preferences. Go to <a href='personalization.html'>Personalize</a> to generate your custom plan. You can order one-time, weekly, or monthly! 🥗"
    },
    {
      patterns: ['allerg', 'gluten', 'vegan', 'vegetarian', 'halal', 'diet restriction'],
      answer: "Absolutely! LyfBite supports dietary restrictions including allergies, vegan, vegetarian, gluten-free, and more. Set your preferences on the <a href='personalization.html'>Personalize page</a> and we'll only show you safe meals. ✅"
    },
    {
      patterns: ['cart', 'checkout', 'billing', 'order', 'payment', 'pay', 'card', 'apple pay', 'google pay', 'cash', 'cod'],
      answer: "We accept Credit/Debit cards, Apple Pay, Google Pay, and Cash on Delivery (for food orders). For subscriptions, online payment is required. Visit the <a href='billing.html'>Cart</a> to checkout. 🛒"
    },
    {
      patterns: ['cancel', 'refund', 'return', 'stop subscription'],
      answer: "To cancel or modify your subscription, please visit <a href='settings.html'>Settings</a> or contact us at <a href='contact.html'>Contact Us</a>. Our team will assist you within 24 hours."
    },
    {
      patterns: ['track', 'tracker', 'calorie', 'macro', 'weight', 'progress'],
      answer: "The <a href='tracker.html'>Tracker</a> lets you log daily food intake, track calories, water, macros, and monitor your progress over time. It's completely free for all users! 📊"
    },
    {
      patterns: ['account', 'signup', 'sign up', 'register', 'login', 'log in', 'password', 'forgot'],
      answer: "You can create a free account at <a href='signup.html'>Sign Up</a> or log in at <a href='login.html'>Login</a>. If you've forgotten your password, use the 'Forgot Password' option on the login page."
    },
    {
      patterns: ['contact', 'support', 'help', 'human', 'agent', 'talk to'],
      answer: "Need extra help? Reach our support team via the <a href='contact.html'>Contact Us</a> page. We're available 7 days a week! 😊"
    },
    {
      patterns: ['dark mode', 'dark theme', 'light mode', 'theme'],
      answer: "You can toggle dark/light mode using the 🌓 button in the navigation bar at the top of any page. Your preference is saved automatically!"
    },
    {
      patterns: ['price', 'cost', 'how much', 'pricing', 'fee', 'aed', 'usd', '$'],
      answer: "Meal prices vary by plan. Individual meals start from a few dollars, with weekly and monthly plans offering 15–25% discounts. Visit the <a href='pricing.html'>Pricing page</a> for full details."
    },
  ];

  const DEFAULT_REPLY = "I'm not sure about that one! 🤔 Try asking about meals, subscriptions, delivery, rewards, or pricing — or visit our <a href='contact.html'>Contact page</a> for human support.";

  function getBotReply(input) {
    const text = input.toLowerCase();
    
    // Check if user is a Plus member
    let isPlusMember = false;
    try {
      const session = JSON.parse(localStorage.getItem('lyfbite_session') || 'null');
      isPlusMember = session && (session.isYearlySubscriber || session.isMonthlySubscriber);
    } catch {}

    for (const faq of FAQ) {
      if (faq.patterns.some(p => text.includes(p))) {
        // Special handling for promo codes: only show PLUS15 to Plus members
        if (faq.patterns.includes('promo') || faq.patterns.includes('coupon') || faq.patterns.includes('discount')) {
          if (!isPlusMember) {
            // Show all codes EXCEPT PLUS15 for non-Plus users
            return "Here are some active codes you can use at checkout:\n• **FIRST30** — 30% off your first order\n• **FREESHIP** — free delivery on any order\n• **SNACKFREE** — free snack pack on orders $55+\n\nVisit <a href='rewards.html'>Rewards</a> to copy codes!";
          }
        }
        return faq.answer;
      }
    }
    return DEFAULT_REPLY;
  }

  // ── Build Widget HTML ──────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #lyfbite-chat-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--ds-primary, #718355), #4a6230);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #lyfbite-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0,0,0,0.3);
    }
    #lyfbite-chat-btn .chat-badge {
      position: absolute;
      top: -4px; right: -4px;
      width: 18px; height: 18px;
      background: #ef4444;
      border-radius: 50%;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }
    #lyfbite-chat-window {
      position: fixed;
      bottom: 5rem;
      right: 1.5rem;
      width: 340px;
      max-height: 480px;
      border-radius: 16px;
      background: var(--ds-surface, #fff);
      border: 1px solid var(--ds-border, #e2e8f0);
      box-shadow: 0 16px 48px rgba(0,0,0,0.18);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    #lyfbite-chat-window.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }
    .chat-header {
      background: linear-gradient(135deg, var(--ds-primary, #718355), #4a6230);
      color: #fff;
      padding: 0.9rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-shrink: 0;
    }
    .chat-header-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
    }
    .chat-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
      flex: 1;
    }
    .chat-header small {
      font-size: 0.72rem;
      opacity: 0.85;
      display: block;
    }
    .chat-close-btn {
      background: none; border: none; color: rgba(255,255,255,0.8);
      cursor: pointer; font-size: 1.1rem; padding: 0.2rem;
      line-height: 1;
    }
    .chat-close-btn:hover { color: #fff; }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      scroll-behavior: smooth;
    }
    .chat-msg {
      max-width: 88%;
      padding: 0.6rem 0.85rem;
      border-radius: 14px;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .chat-msg a { color: var(--ds-primary, #718355); font-weight: 600; }
    .chat-msg.bot {
      background: var(--ds-bg, #f8fafc);
      border: 1px solid var(--ds-border, #e2e8f0);
      color: var(--ds-text-primary, #1a1a1a);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .chat-msg.user {
      background: linear-gradient(135deg, var(--ds-primary, #718355), #4a6230);
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .chat-quick-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0 1rem 0.5rem;
      flex-shrink: 0;
    }
    .chat-quick-btn {
      background: var(--ds-bg, #f1f5f9);
      border: 1px solid var(--ds-border, #e2e8f0);
      border-radius: 99px;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      cursor: pointer;
      color: var(--ds-text-primary, #1a1a1a);
      transition: background 0.15s;
      white-space: nowrap;
    }
    .chat-quick-btn:hover { background: var(--ds-primary, #718355); color: #fff; border-color: var(--ds-primary, #718355); }
    .chat-input-row {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--ds-border, #e2e8f0);
      flex-shrink: 0;
    }
    .chat-input-row input {
      flex: 1;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--ds-border, #e2e8f0);
      border-radius: 99px;
      font-size: 0.85rem;
      background: var(--ds-bg, #f8fafc);
      color: var(--ds-text-primary, #1a1a1a);
      outline: none;
      font-family: inherit;
    }
    .chat-input-row input:focus { border-color: var(--ds-primary, #718355); }
    .chat-send-btn {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: var(--ds-primary, #718355);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .chat-send-btn:hover { background: #4a6230; }
    .chat-typing {
      display: flex; gap: 4px; align-items: center; padding: 0.5rem 0.85rem;
      background: var(--ds-bg, #f8fafc);
      border: 1px solid var(--ds-border, #e2e8f0);
      border-radius: 14px; border-bottom-left-radius: 4px;
      width: fit-content; align-self: flex-start;
    }
    .chat-typing span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--ds-text-secondary, #94a3b8);
      animation: chatDot 1.2s infinite;
    }
    .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
    .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes chatDot {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    @media (max-width: 400px) {
      #lyfbite-chat-window { width: calc(100vw - 2rem); right: 1rem; }
    }
  `;
  document.head.appendChild(style);

  // ── DOM Construction ───────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'lyfbite-chat-btn';
  btn.setAttribute('aria-label', 'Open LyfBite chat assistant');
  btn.innerHTML = `💬<span class="chat-badge" id="chat-badge">1</span>`;

  const win = document.createElement('div');
  win.id = 'lyfbite-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'LyfBite Chat Assistant');
  win.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-avatar">🌿</div>
      <div style="flex:1">
        <h3>LyfBite Assistant</h3>
        <small>🟢 Online — usually replies instantly</small>
      </div>
      <button class="chat-close-btn" id="chat-close-btn" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-quick-btns" id="chat-quick-btns">
      <button class="chat-quick-btn" data-q="What is LyfBite Plus?">LyfBite Plus ✦</button>
      <button class="chat-quick-btn" data-q="Tell me about delivery">Delivery 🚚</button>
      <button class="chat-quick-btn" data-q="Show promo codes">Promo Codes 🎟️</button>
      <button class="chat-quick-btn" data-q="How do rewards work?">Rewards 🎁</button>
      <button class="chat-quick-btn" data-q="How do I generate a meal plan?">Meal Plans 🥗</button>
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Ask me anything…" autocomplete="off" maxlength="200">
      <button class="chat-send-btn" id="chat-send-btn" aria-label="Send message">➤</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  // ── Logic ──────────────────────────────────────────────────────────────
  const messagesEl = document.getElementById('chat-messages');
  const inputEl    = document.getElementById('chat-input');
  const badge      = document.getElementById('chat-badge');
  let isOpen = false;

  function addMsg(text, type) {
    // Remove typing indicator if present
    const typing = messagesEl.querySelector('.chat-typing');
    if (typing) typing.remove();

    const el = document.createElement('div');
    el.className = `chat-msg ${type}`;
    el.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleSend(text) {
    text = text.trim();
    if (!text) return;
    addMsg(text, 'user');
    inputEl.value = '';
    showTyping();
    setTimeout(() => {
      addMsg(getBotReply(text), 'bot');
    }, 600 + Math.random() * 400);
  }

  function openChat() {
    isOpen = true;
    win.classList.add('open');
    btn.innerHTML = '✕';
    badge.style.display = 'none';
    if (messagesEl.children.length === 0) {
      addMsg("👋 Hi! I'm the LyfBite assistant. Ask me about meal plans, subscriptions, delivery, rewards, or anything else!", 'bot');
    }
    inputEl.focus();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    btn.innerHTML = `💬`;
  }

  btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  document.getElementById('chat-close-btn').addEventListener('click', closeChat);

  document.getElementById('chat-send-btn').addEventListener('click', () => handleSend(inputEl.value));
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(inputEl.value); });

  document.getElementById('chat-quick-btns').addEventListener('click', e => {
    const qBtn = e.target.closest('.chat-quick-btn');
    if (qBtn) handleSend(qBtn.dataset.q);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (isOpen && !win.contains(e.target) && e.target !== btn) closeChat();
  });
})();
