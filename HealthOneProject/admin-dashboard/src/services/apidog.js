import axios from 'axios';

/**
 * Cliente fixo para o endpoint real do Supabase:
 * https://yuanqfswhberkoevtmfr.supabase.co/functions/v1/user-info
 */
const apidog = axios.create({
  baseURL: 'https://yuanqfswhberkoevtmfr.supabase.co/functions/v1',
  headers: {
    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Injeta o Authorization Bearer do usuário logado (localStorage: user_token)
apidog.interceptors.request.use((config) => {
  // Se já vier Authorization, respeita
  if (!config.headers?.Authorization) {
    const token = localStorage.getItem('user_token');
    if (!token) {
      // Dica: trate esse erro no chamador para exibir mensagem amigável
      throw new Error('Sem token de sessão: faça login para visualizar os detalhes do usuário.');
    }
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

/**
 * Busca o pacote completo de informações do usuário diretamente no Supabase.
 * Aceita { id } OU { email } como query param.
 * Ex.: GET /user-info?id=<uuid>  ou  GET /user-info?email=<email>
 */
export async function fetchUserFullInfo({ id, email }) {
  const params = id ? { id } : email ? { email } : {};
  if (!params.id && !params.email) {
    throw new Error('Informe id ou email para obter detalhes do usuário.');
  }

  return apidog.get('/user-info', { params });
}

export default apidog;
