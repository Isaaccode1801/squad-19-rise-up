// =========================================================================
//         CÓDIGO DE LOGIN COM INTENÇÃO (auth.js ou <script> no index.html)
// =========================================================================

// --- CONFIGURAÇÕES DA API (as mesmas de antes) ---
const API_BASE_URL = 'https://yuanqfswhberkoevtmfr.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';
const LOGIN_API_URL = `${API_BASE_URL}/auth/v1/token?grant_type=password`;
const USER_INFO_API_URL = `${API_BASE_URL}/functions/v1/user-info`;

/**
 * Função genérica para lidar com o processo de login.
 * @param {Event} event - O evento de submit do formulário.
 * @param {string} intendedRole - O papel que o usuário INTENCIONA usar ('medico', 'secretaria').
 */
// =========================================================================
//         SUBSTITUA SUA FUNÇÃO handleLogin PELA VERSÃO ABAIXO
// =========================================================================

async function handleLogin(event, intendedRole) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const errorMessageDiv = form.querySelector('.error-message');
    const submitButton = form.querySelector('button[type="submit"]');

    errorMessageDiv.style.display = 'none';
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_role');
    submitButton.disabled = true;
    submitButton.textContent = 'Entrando...';

    try {
        // ETAPA 1: Autenticar e pegar o Token
        const loginResponse = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
            throw new Error(loginData.error_description || 'Credenciais inválidas.');
        }

        const accessToken = loginData.access_token;
        localStorage.setItem('user_token', accessToken);

        // ETAPA 2: Buscar os papéis REAIS do usuário
        const userInfoResponse = await fetch(USER_INFO_API_URL, {
            method: 'GET',
            headers: { 'apikey': API_KEY, 'Authorization': `Bearer ${accessToken}` }
        });
        const userInfo = await userInfoResponse.json();
        if (!userInfoResponse.ok) throw new Error('Não foi possível obter as informações do usuário.');
        
        // --- CORREÇÃO: Declarando 'userRoles' apenas uma vez ---
        const userRoles = userInfo.roles || [];

        // --- ETAPA 3: VALIDAÇÃO E REDIRECIONAMENTO ---

        let primaryRole = null; // 1. Declara a variável que vamos usar

        // 2. Define o valor de 'primaryRole' com a lógica de prioridade/desenvolvedor
        if (email === 'riseup@popcode.com.br') {
            // MODO DESENVOLVEDOR: Confia na intenção do clique
            console.warn("MODO DESENVOLVEDOR ATIVO: Permissões da API ignoradas para este usuário.");
            primaryRole = intendedRole;
        } else if (userRoles.includes(intendedRole)) {
            // MODO NORMAL: Verifica as permissões
            primaryRole = intendedRole;
        } else {
            // FALHA: Permissão não encontrada
            throw new Error(`Login aprovado, mas seu usuário não tem permissão de '${intendedRole}'.`);
        }

        localStorage.setItem('user_role', primaryRole);

        // 3. Usa a variável 'primaryRole' para redirecionar

    switch (primaryRole) {
        case 'medico':
            // Caminho relativo à raiz do seu Live Server
            window.location.href = '/medico/tabela-pacientes/dashboard.html';
            break;
        case 'secretaria':
            // Ajuste este caminho para o local correto da página da secretária
            window.location.href = '/Secretaria/dash-secretaria.html';
            break;
        case 'admin':
            // Ajuste este caminho para o local correto da página de admin
            window.location.href = '/Secretaria/admin/dashboard.html';
            break;
        default:
            throw new Error(`Papel '${primaryRole}' não tem um redirecionamento definido.`);
    }

    } catch (error) {
        console.error('Erro no processo de login:', error);
        errorMessageDiv.textContent = error.message;
        errorMessageDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
}
// --- CONECTANDO OS FORMULÁRIOS À LÓGICA ---
const secretariaForm = document.getElementById('secretariaLoginForm');
const medicoForm = document.getElementById('doctorLoginForm');

if (secretariaForm) {
    secretariaForm.addEventListener('submit', (event) => {
        // Quando o form da secretária for enviado, a intenção é 'secretaria'
        handleLogin(event, 'secretaria');
    });
}

if (medicoForm) {
    medicoForm.addEventListener('submit', (event) => {
        // Quando o form do médico for enviado, a intenção é 'medico'
        handleLogin(event, 'medico');
    });
}