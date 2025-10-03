// =========================================================================
//                       ARQUIVO: pacientesService.js (VERSÃO CORRIGIDA)
// =========================================================================

// 1. DADOS DA NOVA API
// CORREÇÃO AQUI: A URL base não deve incluir o nome da tabela no final.
const API_BASE_URL = 'https://yuanqfswhberkoevtmfr.supabase.co/rest/v1'; 
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';
// No topo do seu JS de cadastro

function getAuthHeaders() {
  const userToken = localStorage.getItem('user_token');
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

// Dentro do arquivo: pacientesService.js

// ... (suas funções existentes: listPacientes, getPaciente, createPaciente, deletePaciente) ...

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
    if (!response.ok) {
      // Tenta ler a mensagem de erro da API para ser mais específico
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro ao atualizar paciente: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Falha ao atualizar paciente ${id}:`, error);
    throw error;
  }
}
// Dentro do arquivo: pacientesService.js

// ... (suas funções existentes: getAuthHeaders, listPacientes, getPaciente, createPaciente, updatePaciente) ...

/**
 * Exclui um paciente existente pelo ID.
 * Corresponde ao endpoint: DELETE /patients?id=eq.{id}
 * @param {string | number} id O ID do paciente a ser excluído.
 */
export async function deletePaciente(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients?id=eq.${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    // Para DELETE, um status 204 (No Content) também é sucesso.
    if (!response.ok && response.status !== 204) {
      throw new Error(`Erro ao excluir paciente: ${response.statusText}`);
    }
    
    // A resposta de um DELETE bem-sucedido geralmente é vazia, então não retornamos nada.
    return true; 
    
  } catch (error) {
    console.error(`Falha ao excluir paciente ${id}:`, error);
    throw error;
  }
}
// Dentro do arquivo: pacientesService.js

// ... (suas funções existentes: listPacientes, deletePaciente, etc.) ...

/**
 * Busca a lista completa de laudos na API.
 */
export async function listarLaudos() {
  // ❗️ Lembre-se: Assumindo que a tabela se chama 'laudos'. Altere se for diferente.
  // A query `select=*,patients(full_name)` já traz o nome do paciente.
  try {
    const response = await fetch(`${API_BASE_URL}/reports?select=*,patients(full_name)`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Falha ao listar laudos:', error);
    throw error;
  }
}

/**
 * Exclui um laudo existente pelo ID.
 */
export async function excluirLaudo(id) {
  // ❗️ Assumindo que a tabela se chama 'laudos'. Altere se for diferente.
  try {
    const response = await fetch(`${API_BASE_URL}/reports?id=eq.${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Erro ao excluir laudo: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error(`Falha ao excluir laudo ${id}:`, error);
    throw error;
  }
}// Dentro do arquivo: pacientesService.js

// ... (suas funções existentes: listarLaudos, excluirLaudo, etc.) ...

/**
 * Cria um novo laudo no banco de dados.
 * @param {Object} dadosDoLaudo - Objeto com os dados do novo laudo.
 */
export async function createLaudo(dadosDoLaudo) {
  // ❗️ Lembre-se: Assumindo que a tabela se chama 'laudos'. Altere se for diferente.
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoLaudo)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao criar laudo.');
    }
  } catch (error) {
    console.error('Falha ao criar laudo:', error);
    throw error;
  }
}
// Dentro do arquivo: pacientesService.js

// ... (suas funções existentes: createLaudo, listarLaudos, etc.) ...

/**
 * Busca os dados de UM laudo específico pelo ID.
 * @param {string | number} id O ID do laudo a ser buscado.
 */
export async function getLaudo(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports?id=eq.${id}&select=*,patients(full_name)`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro ao buscar laudo: ${response.statusText}`);
    const data = await response.json();
    return data[0]; // A API retorna uma lista com um item, então pegamos o primeiro.
  } catch (error) {
    console.error(`Falha ao buscar laudo ${id}:`, error);
    throw error;
  }
}


/**
 * Atualiza um laudo existente.
 * @param {string | number} id O ID do laudo a ser atualizado.
 * @param {Object} dadosDoLaudo Objeto com os campos a serem atualizados.
 */
export async function updateLaudo(id, dadosDoLaudo) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports?id=eq.${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosDoLaudo)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao atualizar laudo.');
    }
  } catch (error) {
    console.error(`Falha ao atualizar laudo ${id}:`, error);
    throw error;
  }
}
// Dentro de pacientesService.js

// ... (suas funções de pacientes e laudos) ...

/**
 * Busca a lista completa de MÉDICOS na API.
 */
export async function listarMedicos() {
  // ❗️ Assumindo que sua tabela de médicos se chama 'doctors'. Verifique no Supabase!
  try {
    const response = await fetch(`${API_BASE_URL}/doctors?select=*`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Falha ao listar médicos:', error);
    throw error;
  }
}