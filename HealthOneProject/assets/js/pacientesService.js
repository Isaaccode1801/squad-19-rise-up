// =========================================================================
//                       ARQUIVO: pacientesService.js (VERSÃO CORRIGIDA)
// =========================================================================

// 1. DADOS DA NOVA API
// CORREÇÃO AQUI: A URL base não deve incluir o nome da tabela no final.
const API_BASE_URL = 'https://yuanqfswhberkoevtmfr.supabase.co/rest/v1'; 
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';
// No topo do seu JS de cadastro

function getAuthHeaders() {
  const userToken = localStorage.getItem('token');
  if (!userToken) {
    console.warn('Token de usuário não encontrado no localStorage.');
  }
  return {
    'apikey': API_KEY,
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Busca a lista de todos os pacientes.
 * Agora a URL será montada corretamente: .../rest/v1/patients?select=*
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
 * Agora a URL será montada corretamente: .../rest/v1/patients?id=eq.{id}...
 */
export async function getPaciente(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients?id=eq.${id}&select=*`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro ao buscar paciente: ${response.statusText}`);
    const data = await response.json();
    return data[0]; 
  } catch (error) {
    console.error(`Falha ao buscar paciente ${id}:`, error);
    throw error;
  }
}

/**
 * Cria um novo paciente no banco de dados.
 * Agora a URL será montada corretamente: .../rest/v1/patients
 */
export async function createPaciente(dadosDoPaciente) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoPaciente)
    });
    if (!response.ok) throw new Error(`Erro ao criar paciente: ${response.statusText}`);
  } catch (error) {
    console.error('Falha ao criar paciente:', error);
    throw error;
  }
}

/**
 * Atualiza um paciente existente.
 * Agora a URL será montada corretamente: .../rest/v1/patients?id=eq.{id}
 */
export async function updatePaciente(id, dadosDoPaciente) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients?id=eq.${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoPaciente)
    });
    if (!response.ok) throw new Error(`Erro ao atualizar paciente: ${response.statusText}`);
  } catch (error) {
    console.error(`Falha ao atualizar paciente ${id}:`, error);
    throw error;
  }
}