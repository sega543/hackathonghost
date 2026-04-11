const GhostAuth = (() => {
  const ROUTES = {
    lone:    'lone.html',
    team_4:  'team4.html',
    team_10: 'team10.html',
    admin:   'admin.html',
  };

  const ROUNDS = [
    { round_number:1,  opens_at:'2026-07-01', closes_at:'2026-07-04' },
    { round_number:2,  opens_at:'2026-07-04', closes_at:'2026-07-07' },
    { round_number:3,  opens_at:'2026-07-07', closes_at:'2026-07-10' },
    { round_number:4,  opens_at:'2026-07-10', closes_at:'2026-07-13' },
    { round_number:5,  opens_at:'2026-07-13', closes_at:'2026-07-16' },
    { round_number:6,  opens_at:'2026-07-16', closes_at:'2026-07-19' },
    { round_number:7,  opens_at:'2026-07-19', closes_at:'2026-07-22' },
    { round_number:8,  opens_at:'2026-07-22', closes_at:'2026-07-25' },
    { round_number:9,  opens_at:'2026-07-25', closes_at:'2026-07-28' },
    { round_number:10, opens_at:'2026-07-28', closes_at:'2026-07-31' },
    { round_number:11, opens_at:'2026-07-31', closes_at:'2026-08-01' },
  ];

  function getToken()   { return localStorage.getItem('ghost_token'); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem('ghost_user')); } catch { return null; }
  }

  // Call at top of every protected page
  function gate(requiredRole) {
    const token = getToken();
    const user  = getSession();
    if (!token || !user) { window.location.href = 'login.html'; return null; }
    if (user.role === 'admin') return user;
    // Payment check disabled — will be re-enabled when payment is implemented
    if (requiredRole && requiredRole !== 'any' && user.role !== requiredRole) {
      window.location.href = ROUTES[user.role] || 'login.html';
      return null;
    }
    return user;
  }

  // Authenticated fetch — attaches JWT automatically
  async function api(url, options = {}) {
    const token = getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); return null; }
    return res;
  }

  function getActiveRound() {
    const now = new Date();
    return ROUNDS.find(r => now >= new Date(r.opens_at) && now < new Date(r.closes_at)) || null;
  }

  function logout() {
    localStorage.removeItem('ghost_token');
    localStorage.removeItem('ghost_user');
    window.location.href = 'login.html';
  }

  return { gate, getSession, getToken, getActiveRound, logout, api };
})();
