(() => {
  'use strict';
  const SUPABASE_URL = 'https://zikhzhgxrjpjrkivmwrf.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Inppa2h6aGd4cmpwanJraXZtd3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNjk4ODUsImV4cCI6MjEwMjc0NTg4NX0.-IesVNl4JTozOtPIGhDieJRUN0vcsm0FTNwEyouZzZ8';
  // Keep the same session key and authentication endpoints as the location-analysis tool.
  const TOKEN_KEY = 'realitni-investice-session';
  const LOGIN_API = SUPABASE_URL + '/functions/v1/auth-login';
  const VERIFY_API = SUPABASE_URL + '/functions/v1/location-analysis?action=authorize';

  const style = document.createElement('style');
  style.textContent = `
    #reiSharedAuthGate{position:fixed;inset:0;z-index:2147483000;background:#f3f5f8;display:flex;align-items:center;justify-content:center;padding:18px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#17212b}
    #reiSharedAuthGate[hidden]{display:none}
    #reiSharedAuthGate *{box-sizing:border-box}
    #reiSharedAuthGate .rei-auth-card{width:min(100%,440px);background:white;border:1px solid #dfe5eb;border-radius:16px;padding:24px;box-shadow:0 18px 55px #17212b18}
    #reiSharedAuthGate h1{font-size:25px;margin:0 0 8px;color:#17212b}
    #reiSharedAuthGate p{color:#647180}
    #reiSharedAuthGate label{display:block;margin:16px 0 5px;font-size:13px;color:#586777}
    #reiSharedAuthGate input{width:100%;padding:12px;border:1px solid #cbd5df;border-radius:9px;font:inherit}
    #reiSharedAuthGate button,#reiSharedLogout{padding:11px 14px;border-radius:9px;border:1px solid #2457d6;background:#2457d6;color:white;font:inherit;font-weight:650;cursor:pointer}
    #reiSharedAuthGate button{margin-top:12px;width:100%}
    #reiSharedAuthGate button:disabled{opacity:.65;cursor:wait}
    #reiSharedAuthStatus{min-height:24px;margin-top:12px;font-size:13px;color:#586777}
    #reiSharedLogout{position:fixed;z-index:2147482000;top:10px;right:10px;background:#fff;color:#2457d6;border-color:#ccd5df;font-size:12px;padding:7px 10px}
    #reiSharedLogout[hidden]{display:none}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'reiSharedAuthGate';
  gate.innerHTML = '<section class="rei-auth-card"><small>REALITNÍ INVESTICE · JEDNOTNÉ PŘIHLÁŠENÍ</small><h1>Přihlášení do aplikace</h1><p>Jedním přihlášením získáš přístup ke všem nástrojům. Přihlášení platí i po přechodu mezi stránkami v tomto prohlížeči.</p><form id="reiSharedAuthForm"><label for="reiSharedUsername">Uživatelské jméno</label><input id="reiSharedUsername" type="text" autocomplete="username" required maxlength="80" placeholder="Uživatelské jméno"><label for="reiSharedPassword">Heslo</label><input id="reiSharedPassword" type="password" autocomplete="current-password" required maxlength="200" placeholder="Heslo"><button id="reiSharedSubmit" type="submit">Přihlásit se</button></form><div id="reiSharedAuthStatus" role="status" aria-live="polite">Kontroluji přihlášení…</div></section>';
  document.body.appendChild(gate);
  const logout = document.createElement('button');
  logout.id = 'reiSharedLogout';
  logout.type = 'button';
  logout.textContent = 'Odhlásit';
  logout.hidden = true;
  logout.title = 'Odhlásit se ze všech nástrojů';
  document.body.appendChild(logout);

  const status = document.getElementById('reiSharedAuthStatus');
  const form = document.getElementById('reiSharedAuthForm');
  const submit = document.getElementById('reiSharedSubmit');
  const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
  const clear = () => { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} };
  function showLogin(message) {
    gate.hidden = false;
    logout.hidden = true;
    if (message) status.textContent = message;
  }
  function showApp() {
    gate.hidden = true;
    logout.hidden = false;
  }
  async function verify() {
    const t = token();
    if (!t) { showLogin('Přihlas se pro přístup ke všem nástrojům.'); return; }
    try {
      const response = await fetch(VERIFY_API, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + t, Accept: 'application/json' }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.authorized) {
        clear();
        showLogin(result.error || 'Přihlášení vypršelo. Přihlas se znovu.');
        return;
      }
      showApp();
    } catch (_) {
      showLogin('Přihlášení se nepodařilo ověřit. Zkontroluj připojení a obnov stránku.');
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('reiSharedUsername').value.trim();
    const password = document.getElementById('reiSharedPassword').value;
    if (!username || !password) return;
    submit.disabled = true;
    submit.textContent = 'Ověřuji…';
    status.textContent = 'Ověřuji přihlašovací údaje…';
    try {
      const response = await fetch(LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ username, password }),
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Přihlášení se nepodařilo.');
      if (!result.token) throw new Error('Server nevrátil přihlašovací relaci.');
      try { localStorage.setItem(TOKEN_KEY, result.token); }
      catch (_) { throw new Error('Pro přihlášení povol místní úložiště prohlížeče.'); }
      status.textContent = 'Přihlášení úspěšné.';
      showApp();
    } catch (error) {
      status.textContent = error && error.message ? error.message : 'Přihlášení se nepodařilo.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Přihlásit se';
      document.getElementById('reiSharedPassword').value = '';
    }
  });
  logout.addEventListener('click', () => {
    clear();
    showLogin('Odhlásil ses ze všech nástrojů.');
    document.getElementById('reiSharedUsername').focus();
  });
  verify();
})();