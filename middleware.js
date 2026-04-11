const GhostAuth = (() => {
  const ROUTES = { lone:'lone.html', team_4:'team4.html', team_10:'team10.html', admin:'admin.html' };

  function getToken()   { return sessionStorage.getItem('ghost_token'); }
  function getSession() { try { return JSON.parse(sessionStorage.getItem('ghost_user')); } catch { return null; } }

  // Logout on tab/window close
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('ghost_token');
    sessionStorage.removeItem('ghost_user');
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
    sessionStorage.removeItem('ghost_token');
    sessionStorage.removeItem('ghost_user');
    window.location.href = 'login.html';
  }

  return { gate, getSession, getToken, logout, api };
})();
