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
export { getAuthHeaders as getHeaders };
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

// Observação: Caso não exista coluna deleted_at ou active para soft delete no banco,
// a listagem padrão pode precisar filtrar pacientes excluídos logicamente no front-end.
/**
 * ========================= Helpers de limpeza de FKs =========================
 * Alguns deletes falham (409) por causa de referências (FK) em tabelas-filhas.
 * Os helpers abaixo tentam:
 *  - anular a FK (SET NULL) quando a coluna permite null,
 *  - ou excluir os filhos (DELETE) quando não há outra saída.
 *
 * Ajuste a constante CHILD_RELATIONS conforme seu schema real.
 */

/** Tenta anular a FK: UPDATE {table} SET {column}=NULL WHERE {column}=id */
async function tryNullifyFk(table, column, patientId) {
  const url = `${API_BASE_URL}/${table}?${column}=eq.${patientId}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ [column]: null })
  });
  if (resp.ok || resp.status === 204) return true;
  // 400 geralmente indica coluna não-nullable; apenas retorna false
  return false;
}

/** Tenta excluir filhos: DELETE FROM {table} WHERE {column}=id */
async function tryDeleteChildren(table, column, patientId) {
  const url = `${API_BASE_URL}/${table}?${column}=eq.${patientId}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Prefer': 'return=minimal'
    }
  });
  return (resp.ok || resp.status === 204);
}

/**
 * Limpa relações filhas conhecidas antes de deletar o paciente.
 * Ajuste esta lista conforme seu banco. A ordem importa (do mais dependente para o menos).
 */
const CHILD_RELATIONS = [
  // Ex.: agendas, consultas, pagamentos, laudos, etc.
  // mode: 'nullify' tentará SET NULL; se falhar, cai para 'delete' como fallback.
  { table: 'appointments', column: 'patient_id',   mode: 'delete'  },
  { table: 'reports',      column: 'patient_id',   mode: 'delete'  },
  { table: 'invoices',     column: 'patient_id',   mode: 'delete'  },
  { table: 'payments',     column: 'patient_id',   mode: 'delete'  },
  { table: 'prescriptions',column: 'patient_id',   mode: 'delete'  },
  { table: 'exams',        column: 'patient_id',   mode: 'delete'  },
  // Se houver uma relação de “médico designado” no próprio patient (ex.: doctor_id),
  // não é child; é coluna do paciente. Trate isso via updatePaciente antes do delete se precisar.
];

/** Executa a limpeza, respeitando o modo. */
async function cleanupChildren(patientId) {
  for (const rel of CHILD_RELATIONS) {
    try {
      if (rel.mode === 'nullify') {
        const okNull = await tryNullifyFk(rel.table, rel.column, patientId);
        if (!okNull) {
          // tenta deletar se não deu para anular
          await tryDeleteChildren(rel.table, rel.column, patientId);
        }
      } else {
        await tryDeleteChildren(rel.table, rel.column, patientId);
      }
    } catch (e) {
      // Não aborta toda a limpeza por uma tabela; apenas loga e segue
      console.warn(`[cleanupChildren] falhou em ${rel.table}.${rel.column}:`, e?.message || e);
    }
  }
}

/**
 * Exclui um paciente existente pelo ID.
 * Fluxo:
 *   1) Tenta DELETE direto.
 *   2) Se 409, executa cleanupChildren (remove filhos) e tenta DELETE novamente.
 *   3) Se ainda falhar, tenta soft delete (marcar coluna, se existir).
 *   4) Se nada funcionar, lança erro explicando as opções.
 */
export async function deletePaciente(id) {
  async function softDeletePaciente(targetId) {
    const url = `${API_BASE_URL}/patients?id=eq.${targetId}`;
    const candidates = [
      { field: 'deleted_at', value: new Date().toISOString() },
      { field: 'is_deleted', value: true },
      { field: 'deleted',    value: true },
      { field: 'active',     value: false },
      { field: 'status',     value: 'deleted' }, // tentativa extra comum
      { field: 'enabled',    value: false }      // tentativa extra comum
    ];

    for (const c of candidates) {
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ [c.field]: c.value })
      });
      if (resp.ok || resp.status === 204) return { mode: `soft:${c.field}` };
      if (resp.status !== 400) {
        // loga o erro e segue tentando as próximas colunas
        const errTxt = await resp.text().catch(() => '');
        console.warn(`[softDeletePaciente] tentativa ${c.field} falhou:`, resp.status, errTxt);
      }
    }
    throw new Error(
      "Soft delete falhou: nenhuma coluna padrão de soft delete pôde ser atualizada. " +
      "Remova vínculos (FKs) ou peça ao backend para criar e liberar uma dessas colunas."
    );
  }

  // 1) Tenta delete direto
  const url = `${API_BASE_URL}/patients?id=eq.${id}`;
  let response = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Prefer': 'return=minimal'
    }
  });

  if (response.ok || response.status === 204) {
    return { mode: 'hard' };
  }

  // 2) Se 409, limpa filhos e tenta novamente
  if (response.status === 409) {
    await cleanupChildren(id);
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'Prefer': 'return=minimal'
      }
    });
    if (response.ok || response.status === 204) {
      return { mode: 'hard-after-cleanup' };
    }
  }

  // 3) Se ainda não deu, tenta soft delete
  if (response.status === 409) {
    return await softDeletePaciente(id);
  }

  // 4) Outros erros
  const msg = await response.text().catch(() => '');
  throw new Error(`Erro ao excluir paciente: ${response.status}${msg ? ' ' + msg : ''}`);
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
 * Busca a lista completa de MÉDICOS.
 * 1) Tenta a tabela 'doctors'
 * 2) Fallback: usa 'profiles' filtrando por role=medico (se a coluna existir)
 */
export async function listarMedicos() {
  // TENTATIVA 1: doctors
  try {
    const resp = await fetch(`${API_BASE_URL}/doctors?select=*`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length) return data;
    } else {
      // Se 404/400, cai para fallback
      if (resp.status !== 404 && resp.status !== 400) {
        const errTxt = await resp.text().catch(() => '');
        console.warn('[listarMedicos] doctors falhou:', resp.status, errTxt);
      }
    }
  } catch (err) {
    console.warn('[listarMedicos] erro na tabela doctors:', err?.message || err);
  }

  // TENTATIVA 2: profiles com role=medico (se existir essa coluna)
  try {
    const url = `${API_BASE_URL}/profiles?select=id,full_name,email,phone,role&role=eq.medico&order=full_name.asc`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => '');
      throw new Error(`Falha no fallback profiles: ${resp.status} ${errTxt}`);
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Falha ao listar médicos (fallback profiles):', err);
    // Por fim, retorna array vazio para não quebrar a UI
    return [];
  }
}