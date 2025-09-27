// =========================================================================
//                       ARQUIVO: pacientesService.js
// =========================================================================

// 1. DADOS DA NOVA API (substitua se o chefe passar novos valores)
const API_BASE_URL = 'https://yusnqfswhberkoevtmfr.supabase.co/rest/v1';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';

/**
 * Função auxiliar para montar os headers de autenticação.
 * Ela busca o token do usuário que foi salvo no localStorage após o login.
 */
function getAuthHeaders() {
  // O token do usuário precisa ser salvo no localStorage quando ele faz login.
  // Exemplo: localStorage.setItem('user_token', tokenRecebidoDaAPIDeLogin);
  const userToken = localStorage.getItem('user_token');

  if (!userToken) {
    // Se não houver token, talvez o usuário não esteja logado.
    // A API provavelmente retornará um erro 401 (Não Autorizado).
    console.warn('Token de usuário não encontrado no localStorage.');
  }

  return {
    'apikey': API_KEY,
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json' // Padrão para enviar dados em JSON
  };
}

/**
 * Busca a lista de todos os pacientes.
 * Corresponde ao endpoint: GET /patients
 */
export async function listPacientes() {
  try {
    const response = await fetch(`${API_BASE_URL}/patients?select=*`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Falha ao listar pacientes:', error);
    throw error;
  }
}

/**
 * Busca os dados de UM paciente específico pelo ID.
 * Corresponde ao endpoint: GET /patients?id=eq.{id}
 * @param {string | number} id O ID do paciente a ser buscado.
 */
export async function getPaciente(id) {
  try {
    // Note a nova estrutura da URL para buscar por ID
    const response = await fetch(`${API_BASE_URL}/patients?id=eq.${id}&select=*`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro ao buscar paciente: ${response.statusText}`);
    
    // A API retorna uma lista com um item, então pegamos o primeiro.
    const data = await response.json();
    return data[0]; 
  } catch (error) {
    console.error(`Falha ao buscar paciente ${id}:`, error);
    throw error;
  }
}

/**
 * Cria um novo paciente no banco de dados.
 * Corresponde ao endpoint: POST /patients
 * @param {Object} dadosDoPaciente Objeto com os dados do novo paciente.
 */
export async function createPaciente(dadosDoPaciente) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoPaciente)
    });
    if (!response.ok) throw new Error(`Erro ao criar paciente: ${response.statusText}`);
    // Geralmente POST retorna o objeto criado ou um status de sucesso.
    // Aqui não retornamos nada, mas poderíamos retornar response.json().
  } catch (error) {
    console.error('Falha ao criar paciente:', error);
    throw error;
  }
}

/**
 * Atualiza um paciente existente.
 * Corresponde ao endpoint: PATCH /patients?id=eq.{id}
 * @param {string | number} id O ID do paciente a ser atualizado.
 * @param {Object} dadosDoPaciente Objeto com os campos a serem atualizados.
 */
export async function updatePaciente(id, dadosDoPaciente) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients?id=eq.${id}`, {
      method: 'PATCH', // Supabase usa PATCH para atualizações parciais
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoPaciente)
    });
    if (!response.ok) throw new Error(`Erro ao atualizar paciente: ${response.statusText}`);
  } catch (error) {
    console.error(`Falha ao atualizar paciente ${id}:`, error);
    throw error;
  }
}