/**
 * LyfBite Auth Module
 * Handles sign-up, log-in, log-out, and profile icon state.
 * Connects to the /api/auth/* backend endpoints which use MongoDB.
 * Falls back gracefully to localStorage if server is unreachable.
 */
const lyfbiteAuth = (() => {
  const SESSION_KEY = 'lyfbite_session';

  // ── helpers ───────────────────────────────────────────────
  // Clear persistent session on initial tab load so the app always opens "logged out"
  if (!sessionStorage.getItem('lyfbite_initialized')) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem('lyfbite_initialized', 'true');
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ── admin check (client-side, verified server-side on admin page) ─
  async function isAdminUser() {
    const user = getUser();
    if (!user) return false;
    const localAdminEmail = localStorage.getItem('lyfbite_admin_email') || 'admin@lyfbite.com';
    if (user.email === localAdminEmail) return true;
    try {
      const res = await fetch('/api/admin/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      return !!data.isAdmin;
    } catch { return false; }
  }

  // ── sign-up ───────────────────────────────────────────────
  async function signup({ firstName, lastName, email, password }) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        saveSession(data.user);
        return { success: true };
      }
      return { success: false, message: data.message || 'Sign-up failed.' };
    } catch {
      // Offline / server not running — store locally so page still works
      const existing = getAllLocalUsers().find(u => u.email === email);
      if (existing) return { success: false, message: 'An account with this email already exists.' };
      const user = { id: 'local_' + Date.now(), firstName, lastName, email, isYearlySubscriber: false, isMonthlySubscriber: false };
      saveLocalUser(user, password);
      saveSession(user);
      return { success: true };
    }
  }

  // ── log-in ────────────────────────────────────────────────
  async function login({ email, password }) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        // ── Preserve subscription status from local storage ──────────────────
        const localUsers = getAllLocalUsers();
        const localUser = localUsers.find(u => u.email === email);
        if (localUser) {
          data.user.isMonthlySubscriber = localUser.isMonthlySubscriber || data.user.isMonthlySubscriber || false;
          data.user.isYearlySubscriber = localUser.isYearlySubscriber || data.user.isYearlySubscriber || false;
        }
        saveSession(data.user);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid email or password.' };
    } catch {
      // Offline fallback — match against locally stored accounts
      const match = getAllLocalUsers().find(u => u.email === email && u._pw === hashSimple(password));
      if (match) {
        const { _pw, ...user } = match;
        saveSession(user);
        return { success: true };
      }
      return { success: false, message: 'Invalid email or password.' };
    }
  }

  // ── log-out ───────────────────────────────────────────────
  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    clearSession();
    window.location.href = 'index.html';
  }

  // ── upgrade to yearly subscription ────────────────────────
  async function setYearlySubscriber() {
    const user = getUser();
    if (!user) return;
    user.isYearlySubscriber = true;
    saveSession(user);
    try {
      await fetch('/api/auth/set-yearly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || user._id })
      });
    } catch {}
    updateLocalUser(user);
  }

  // ── upgrade to monthly subscription ────────────────────────
  async function setMonthlySubscriber() {
    const user = getUser();
    if (!user) return;
    user.isMonthlySubscriber = true;
    saveSession(user);
    try {
      await fetch('/api/auth/set-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || user._id })
      });
    } catch {}
    updateLocalUser(user);
  }

  // ── nav profile icon ──────────────────────────────────────
  function updateNavProfile() {
    const user = getUser();
    const iconEl = document.getElementById('nav-profile-icon');
    const avatarEl = document.getElementById('profile-avatar');
    const goldBadge = document.getElementById('gold-plus-badge');
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (!iconEl) return;

    if (user) {
      // Show initials avatar
      const initials = ((user.firstName || '?')[0] + (user.lastName || '?')[0]).toUpperCase();
      if (avatarEl) {
        avatarEl.textContent = initials;
        avatarEl.style.cssText = `
          background: linear-gradient(135deg, var(--ds-primary), #5a7040);
          color: white;
          border-radius: 50%;
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.5px;
        `;
      }
      // Gold plus badge for yearly subscribers
      if (goldBadge) {
        goldBadge.style.display = (user.isYearlySubscriber || user.isMonthlySubscriber) ? 'inline' : 'none';
      }
      // Show logout button
      if (logoutBtn) logoutBtn.style.display = 'flex';

      // Profile icon links to a simple profile dropdown
      iconEl.href = '#';
      iconEl.onclick = (e) => {
        e.preventDefault();
        toggleProfileDropdown(user);
      };
    } else {
      if (avatarEl) avatarEl.textContent = '👤';
      if (goldBadge) goldBadge.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      iconEl.href = 'login.html';
      iconEl.onclick = null;
    }
    // Hide Plus nav link if already subscribed
    hidePlusNavForSubscribers();
    // Guard cart link — login required
    guardCartLink();
  }

  // ── profile dropdown ──────────────────────────────────────
  function toggleProfileDropdown(user) {
    let dropdown = document.getElementById('profile-dropdown');
    if (dropdown) { dropdown.remove(); return; }

    dropdown = document.createElement('div');
    dropdown.id = 'profile-dropdown';
    dropdown.innerHTML = `
      <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--ds-border);">
        <div style="font-weight:700; color:var(--ds-text-primary); font-size:0.95rem;">
          ${user.firstName} ${user.lastName}
          ${(user.isYearlySubscriber || user.isMonthlySubscriber) ? '<span style="color:#D4AF37; font-size:0.8rem; margin-left:0.4rem;">✦ Plus</span>' : ''}
        </div>
        <div style="font-size:0.8rem; color:var(--ds-text-secondary); margin-top:0.2rem;">${user.email}</div>
      </div>
      ${(user.isYearlySubscriber || user.isMonthlySubscriber) ? `
      <div style="padding:0.6rem 1.25rem; background: linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05)); border-bottom:1px solid var(--ds-border);">
        <span style="color:#D4AF37; font-size:0.82rem; font-weight:600;">✦ LyfBite Plus (${user.isYearlySubscriber ? 'Yearly' : 'Monthly'}) — Active</span>
      </div>` : `
      <a href="plus.html" style="display:block; padding:0.6rem 1.25rem; font-size:0.85rem; color:var(--ds-primary); font-weight:600; text-decoration:none; border-bottom:1px solid var(--ds-border);" onclick="window.location.href='plus.html';return false;">
        ⭐ Upgrade to Plus
      </a>`}
      <div id="dd-admin-link" style="display:none; border-top:1px solid var(--ds-border);">
        <a href="admin.html" onclick="window.location.href='admin.html'; return false;" style="display:block; padding:0.65rem 1.25rem; font-size:0.85rem; color:#e53e3e; font-weight:700; text-decoration:none; letter-spacing:0.2px;">
          🛡️ Admin Panel
        </a>
      </div>
      <button id="dd-logout" style="display:block; width:100%; text-align:left; padding:0.75rem 1.25rem; font-size:0.88rem; color:#e53e3e; background:none; border:none; cursor:pointer; font-family:inherit; font-weight:500;">
        🚪 Log Out
      </button>
    `;
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: '100%',
      right: '0',
      marginTop: '0.5rem',
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-border)',
      borderRadius: '14px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      zIndex: '9999',
      minWidth: '220px',
      overflow: 'hidden'
    });

    const iconEl = document.getElementById('nav-profile-icon');
    iconEl.style.position = 'relative';
    iconEl.appendChild(dropdown);

    dropdown.querySelector('#dd-logout').addEventListener('click', () => logout());

    // Show admin link if user is admin
    isAdminUser().then(admin => {
      const adminLink = dropdown.querySelector('#dd-admin-link');
      if (adminLink && admin) adminLink.style.display = 'block';
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!dropdown.contains(e.target) && e.target !== iconEl) {
          dropdown.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 50);
  }

  // ── local-only storage helpers (offline fallback) ─────────
  const LOCAL_USERS_KEY = 'lyfbite_local_users';

  function hashSimple(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  function getAllLocalUsers() {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]'); } catch { return []; }
  }

  function saveLocalUser(user, password) {
    const users = getAllLocalUsers();
    users.push({ ...user, _pw: hashSimple(password) });
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  function updateLocalUser(updatedUser) {
    const users = getAllLocalUsers().map(u =>
      u.email === updatedUser.email ? { ...u, ...updatedUser } : u
    );
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    // Also refresh session
    const sessionUser = getUser();
    if (sessionUser && sessionUser.email === updatedUser.email) {
      saveSession({ ...sessionUser, ...updatedUser });
    }
  }

  // ── intercept cart icon — require login ─────────────────────────────────
  function guardCartLink() {
    const cartLinks = document.querySelectorAll('a.nav-cart, a[href="billing.html"]');
    cartLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const user = getUser();
        if (!user) {
          e.preventDefault();
          window.location.href = 'signup.html';
        }
      });
    });
  }

  // ── hide Plus nav link for yearly subscribers ───────────────────────────
  function hidePlusNavForSubscribers() {
    const user = getUser();
    if (!user || (!user.isYearlySubscriber && !user.isMonthlySubscriber)) return;
    // Find and hide "LyfBite Plus" nav link on all pages (except plus.html itself which shows already-subscribed msg)
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.textContent.trim() === 'LyfBite Plus') {
        a.style.display = 'none';
      }
    });
  }

  return { signup, login, logout, getUser, isAdminUser, setYearlySubscriber, setMonthlySubscriber, updateNavProfile, hidePlusNavForSubscribers, guardCartLink };
})();
