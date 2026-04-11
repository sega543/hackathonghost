const GhostAuth = (() => {
  const ROUTES = { lone:'lone.html', team_4:'team4.html', team_10:'team10.html', admin:'admin.html' };

  // Admin uses localStorage (persists across tabs/redirects)
  // Players use sessionStorage (clears on tab close)
  function getToken() {
    return localStorage.getItem('ghost_token') || sessionStorage.getItem('ghost_token');
  }
  function getSession() {
    try {
      const s = localStorage.getItem('ghost_user') || sessionStorage.getItem('ghost_user');
      return JSON.parse(s);
    } catch { return null; }
  }
  function setSession(token, user) {
    if (user.role === 'admin') {
      localStorage.setItem('ghost_token', token);
      localStorage.setItem('ghost_user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('ghost_token', token);
      sessionStorage.setItem('ghost_user', JSON.stringify(user));
    }
  }

  // Players logout on tab close, admins don't
  window.addEventListener('beforeunload', () => {
    const user = getSession();
    if (user && user.role !== 'admin') {
      sessionStorage.removeItem('ghost_token');
      sessionStorage.removeItem('ghost_user');
    }
  });

  function gate(requiredRole) {
    const token = getToken();
    const user  = getSession();
    if (!token || !user) { window.location.href = 'login.html'; return null; }
    if (user.role === 'admin') return user;
    if (!user.payment_status) { window.location.href = 'pending-payment.html'; return null; }
    if (requiredRole && requiredRole !== 'any' && user.role !== requiredRole) {
      window.location.href = ROUTES[user.role] || 'login.html'; return null;
    }
    return user;
  }

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

  function logout() {
    localStorage.removeItem('ghost_token');
    localStorage.removeItem('ghost_user');
    sessionStorage.removeItem('ghost_token');
    sessionStorage.removeItem('ghost_user');
    window.location.href = 'login.html';
  }

  return { gate, getSession, getToken, setSession, logout, api };
})();
