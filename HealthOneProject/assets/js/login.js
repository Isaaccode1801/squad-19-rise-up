const API_BASE_URL = 'https://yuanqfswhberkoevtmfr.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';
const LOGIN_API_URL = `${API_BASE_URL}/auth/v1/token?grant_type=password`;
const USER_INFO_API_URL = `${API_BASE_URL}/functions/v1/user-info`;

/** Debug simples para ver rapidamente de onde estamos redirecionando */
console.log('[LOGIN] base=', window.location.origin, 'path=', window.location.pathname);

function decodeRoleFromJWT(token){
  if (!token?.includes('.')) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.app_metadata?.role || payload?.user_metadata?.role || null;
  } catch { return null; }
}

async function handleLogin(event, intendedRole) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector('input[type="email"]').value;
  const password = form.querySelector('input[type="password"]').value;
  const errorMessageDiv = form.querySelector('.error-message');
  const submitButton = form.querySelector('button[type="submit"]');

  errorMessageDiv && (errorMessageDiv.style.display = 'none');
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_role');
  submitButton.disabled = true;
  submitButton.textContent = 'Entrando...';

  try {
    // 1) Login
    const loginResp = await fetch(LOGIN_API_URL, {
      method: 'POST',
      headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginResp.json();
    if (!loginResp.ok) throw new Error(loginData?.error_description || 'Credenciais inválidas.');

    const accessToken = loginData.access_token;
    localStorage.setItem('user_token', accessToken);

    // 2) Tenta pegar roles via function; se falhar, faz fallback no JWT
    let roles = [];
    try {
      const infoResp = await fetch(USER_INFO_API_URL, {
        method: 'GET',
        headers: { 'apikey': API_KEY, 'Authorization': `Bearer ${accessToken}` }
      });
      if (infoResp.ok) {
        const info = await infoResp.json();
        roles = info?.roles || [];
      }
    } catch {}
    if (!roles.length) {
      const r = decodeRoleFromJWT(accessToken);
      if (r) roles = [r];
    }

    // 3) Determina o papel e redireciona
    // Descobre o papel final com base na intenção do clique + permissões reais
    // Regra: se for o e-mail dev, usa a intenção. Senão, se tiver permissão para a intenção, usa a intenção.
    // Caso contrário, cai no primeiro papel disponível; se não houver, usa a intenção mesmo (para não quebrar).
    const DEV_EMAIL = 'riseup@popcode.com.br';
    let primaryRole = null;

    if (email === DEV_EMAIL) {
      primaryRole = intendedRole;
      console.warn('[LOGIN] DEV override: usando intenção =>', primaryRole);
    } else if (Array.isArray(roles) && roles.includes(intendedRole)) {
      primaryRole = intendedRole;
    } else if (Array.isArray(roles) && roles.length) {
      primaryRole = roles[0];
    } else {
      primaryRole = intendedRole;
    }

    // Guarda para outras páginas
    localStorage.setItem('user_role', primaryRole);
    console.log('[LOGIN] intendedRole=', intendedRole, 'roles=', roles, 'primaryRole=', primaryRole);
    // Mapeia rotas de destino (ajuste se seus arquivos mudarem de lugar)
    const ROUTES = {
      medico: 'medico/tabela-pacientes/dashboard.html',
      secretaria: 'Secretaria/dash-secretaria.html',
      admin: 'admin-dashboard/dist/index.html#/',
    };

    function toAbs(path) {
      // Garante URL absoluta a partir da raiz do projeto servido pelo Live Server
      // Ex.: http://127.0.0.1:5500/ + path
      const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      // Se já começar com http/https ou "/", mantemos
      if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
      return base + path.replace(/^\.?\//, '');
    }

    const destRel = ROUTES[primaryRole];
    if (!destRel) {
      throw new Error(`Papel '${primaryRole}' não tem redirecionamento definido.`);
    }

    const destAbs = toAbs(destRel);
    console.log('[LOGIN] role=', primaryRole, '=>', destAbs);

    // Redireciona de forma "hard", sem manter histórico do formulário
    window.location.replace(destAbs);

  } catch (err) {
    console.error('Erro no processo de login:', err);
    if (errorMessageDiv) {
      errorMessageDiv.textContent = err.message || 'Falha no login.';
      errorMessageDiv.style.display = 'block';
    }
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
  }
}

// listeners
const secretariaForm = document.getElementById('secretariaLoginForm');
const medicoForm = document.getElementById('doctorLoginForm');
const adminForm = document.getElementById('adminLoginForm');

secretariaForm && secretariaForm.addEventListener('submit', (e)=>handleLogin(e,'secretaria'));
medicoForm && medicoForm.addEventListener('submit', (e)=>handleLogin(e,'medico'));
adminForm && adminForm.addEventListener('submit', (e)=>handleLogin(e,'admin'));
