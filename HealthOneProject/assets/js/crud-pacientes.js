// assets/js/crud-pacientes.js (VERSÃO CORRIGIDA)

/* ========================= Imports (API) ========================= */
// CORREÇÃO 1: Removido 'deletePaciente' que não existe no seu service.
//             Adicionado 'updatePaciente' que pode ser útil.
// No topo do arquivo: crud-pacientes.js

// Adicione 'deletePaciente' aqui
import { listPacientes, createPaciente, getPaciente, updatePaciente, deletePaciente } from './pacientesService.js';

/* ========================= Seletores / Estado ========================= */
const tbody = document.getElementById('tbody');
const pager = document.getElementById('pager');
const q = document.getElementById('q');
const countLabel = document.getElementById('countLabel');
const btnNew = document.getElementById('btnNew');

let todosPacientes = []; // Cache de todos os pacientes vindos da API
let filtro = '';
let page = 1;
const perPage = 10;

/* ========================= Helpers (mantidos como estavam) ========================= */


function parseDateSmart(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  
  // Tenta reconhecer o formato YYYY-MM-DD, que é o padrão da sua API
  let m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m) {
    const yyyy = +m[1], mm = +m[2], dd = +m[3];
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    // Validação para garantir que a data é real (ex: não 2025-02-30)
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) {
      return d;
    }
  }
  
  // Se não for o formato esperado, tenta um parse genérico
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function formatData(input) {
  const d = parseDateSmart(input);
  if (!d) return '—';
  
  // Formata a data para o padrão brasileiro (dd/mm/aaaa)
  // Usamos Intl.DateTimeFormat para uma formatação mais moderna e correta
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

function calcIdade(input) {
  // A data da API vem no formato 'YYYY-MM-DD'
  const d = new Date(input);
  if (isNaN(d)) return null;
  
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) {
    idade--;
  }
  return idade;
}

function iniciais(nome) {
  if (!nome) return "??";
  return nome.split(/\s+/)
             .slice(0, 2)
             .map(p => p[0])
             .join('')
             .toUpperCase();
}
function normalize(s) { return (s || '').toString().toLowerCase(); }
function formatCPF(v) {
  if (!v) return "—";
  const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
  return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/* ========================= Lógica Principal ========================= */

// Função que busca os dados da API e inicia a renderização
// Dentro de crud-pacientes.js

async function fetchAndRender() {
  try {
    tbody.innerHTML = `<tr><td colspan="7">Carregando pacientes...</td></tr>`;

    const pacientesDaApi = await listPacientes();
    console.log("DADOS VINDOS DA API:", pacientesDaApi); // <-- ADICIONE ESTA LINHA

    let listaDePacientes = []; // Inicia uma lista vazia para garantir

    if (Array.isArray(pacientesDaApi)) {
      // CASO 1: A API se comportou como esperado e retornou um array
      console.log("API retornou um array de pacientes.");
      listaDePacientes = pacientesDaApi;
    } else if (pacientesDaApi && typeof pacientesDaApi === 'object') {
      // CASO 2: A API se comportou de forma inesperada e retornou um objeto único
      console.warn("A API retornou um objeto único, convertendo para array.");
      // Nós o transformamos em um array com um único item
      listaDePacientes = [pacientesDaApi];
    }
    // Se não for nem array nem objeto, a lista continuará vazia, evitando erros.

    todosPacientes = listaDePacientes; // Salva no cache a lista corrigida
    render(); // Chama a função para desenhar a tabela na tela

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="color: red;">Erro ao carregar a lista de pacientes: ${err.message}</td></tr>`;
  }
}

// Função que desenha a tabela na tela
function render() {
  // Filtro local (client-side)
  const termoBusca = normalize(filtro);
  const pacientesFiltrados = termoBusca
    ? todosPacientes.filter(p => normalize(p.name).includes(termoBusca) || normalize(p.cpf).includes(termoBusca))
    : todosPacientes;

  const total = pacientesFiltrados.length;
  countLabel.textContent = `Mostrando ${total} de ${todosPacientes.length} paciente(s)`;

  // Paginação (simplificada por enquanto)
  const start = (page - 1) * perPage;
  const pacientesPaginados = pacientesFiltrados.slice(start, start + perPage);

  if (pacientesPaginados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum paciente encontrado.</td></tr>`;
    return;
  }

  // CORREÇÃO 3: Ajustado para usar os nomes dos campos da sua API (name, cpf, email, phone, address).
  tbody.innerHTML = pacientesPaginados.map((p, i) => `
    <tr>
      <td>${start + i + 1}</td>
      <td>${p.full_name || '—'}</td>
      <td>${p.cpf ? formatCPF(p.cpf) : '—'}</td>
      <td>${p.email || '—'}</td>
      <td>${p.phone_mobile || '—'}</td>
      <td>${p.city || '—'}</td>
      <td class="col-actions">
        <button class="page-btn btn-view" type="button" data-id="${p.id}" title="Ver carteirinha">👁️</button>
        <a href="../../medico/tabela-pacientes/cadastro.html?id=${p.id}" class="page-btn btn-edit" title="Editar">✏️</a>
        <button class="page-btn btn-del" type="button" data-id="${p.id}" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Adiciona os eventos aos novos botões criados
  document.querySelectorAll('[data-id].btn-del').forEach(b => b.onclick = () => onDelete(b.dataset.id));
  document.querySelectorAll('[data-id].btn-view').forEach(b => b.onclick = () => onView(b.dataset.id));
}


// ... (suas outras funções como fetchAndRender, render) ...

/* ========================= Ações dos Botões ========================= */

// ✅ ADICIONE ESTA FUNÇÃO
async function onDelete(id) {
  // Pede confirmação ao usuário antes de prosseguir
  if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
    return; // Se o usuário clicar em "Cancelar", a função para aqui.
  }

  try {
    // Chama a função do service para deletar o paciente na API
    await deletePaciente(id);
    
    alert('Paciente excluído com sucesso!');
    
    // A forma mais fácil de atualizar a tabela é recarregar os dados da API
    fetchAndRender(); 
    
  } catch (e) {
    console.error(e);
    alert('Falha ao excluir o paciente.');
  }
}



function onView(id) {
  // Busca o paciente na lista que já temos em memória
  const paciente = todosPacientes.find(p => p.id == id);
  
  if (paciente) {
    // Em vez de um 'alert', chamamos a função que abre e preenche o modal
    abrirCarteirinha(paciente);
  } else {
    // Se, por algum motivo, não encontrar o paciente, avisa o usuário
    alert('Não foi possível encontrar os dados deste paciente.');
  }
}
// =========================================================================
//         COLE ESTE BLOCO NO FINAL DO SEU crud-pacientes.js
// =========================================================================

/* ========================= MODAL Carteirinha ========================= */

// --- Seletores para os elementos do modal ---
const overlay = document.getElementById('carteirinha-overlay');
const closeBtn = document.querySelector('.close-btn');

/**
 * Preenche o modal da carteirinha com os dados do paciente.
 * @param {object} p - O objeto do paciente vindo da API.
 */
function preencherCarteirinha(p) {
  if (!p) {
    alert('Não foi possível encontrar os dados deste paciente.');
    return;
  }
  
  // Funções auxiliares (assumindo que já existem no seu arquivo)
  const cId = (id) => document.getElementById(id);
  // Se as funções abaixo não estiverem no topo do seu arquivo,
  // você pode descomentar e usá-las aqui ou movê-las para o topo.
  // const calcIdade = (input) => { ... };
  // const formatData = (input) => { ... };
  // const formatCPF = (input) => { ... };
  // const iniciais = (nome) => { ... };

  // --- PREENCHIMENTO DOS CAMPOS ---
  cId('c-nome') && (cId('c-nome').textContent = p.full_name || '—');
  
  const idade = p.birth_date ? calcIdade(p.birth_date) : null;
  cId('c-idade') && (cId('c-idade').textContent = idade !== null ? `${idade} anos` : '—');

  cId('c-genero') && (cId('c-genero').textContent = p.gender || '—');
  cId('c-cpf') && (cId('c-cpf').textContent = p.cpf ? formatCPF(p.cpf) : '—');
  cId('c-iniciais') && (cId('c-iniciais').textContent = p.full_name ? iniciais(p.full_name) : '??');
  
  // Campos que podem não existir na sua API ainda
  cId('c-ultima') && (cId('c-ultima').textContent = formatData(p.last_appointment) || '—');
  cId('c-proxima') && (cId('c-proxima').textContent = formatData(p.next_appointment) || '—');
  cId('c-observacoes') && (cId('c-observacoes').textContent = p.observations || '—');
}

/**
 * Abre o modal da carteirinha e chama a função de preenchimento.
 * @param {object} paciente - O objeto completo do paciente.
 */
function abrirCarteirinha(paciente) {
  if (!overlay) {
    console.warn('⚠️ Elemento #carteirinha-overlay não encontrado no DOM.');
    alert('A estrutura HTML da carteirinha não foi encontrada nesta página.');
    return;
  }
  
  preencherCarteirinha(paciente);
  overlay.setAttribute('aria-hidden', 'false');
  
  // Animação de entrada
  const card = document.getElementById('carteirinha');
  if (card) {
    card.style.animation = 'cardEnter .35s cubic-bezier(.22,.9,.27,1.05) forwards';
  }
}

/**
 * Fecha o modal da carteirinha.
 */
function fecharCarteirinha() {
  overlay?.setAttribute('aria-hidden', 'true');
}

// --- Event Listeners para fechar o modal ---
closeBtn?.addEventListener('click', fecharCarteirinha);
overlay?.addEventListener('click', (e) => {
  if (e.target === overlay) fecharCarteirinha();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharCarteirinha();
});

// A sua função onView deve continuar como está, ela já está correta:
// function onView(id) {
//   const paciente = todosPacientes.find(p => p.id == id);
//   if (paciente) {
//     abrirCarteirinha(paciente);
//   } else {
//     alert('Não foi possível encontrar os dados deste paciente.');
//   }
// }

// Evento de busca no input
q?.addEventListener('input', () => {
  filtro = q.value;
  page = 1;
  render();
});

// Botão "Novo Paciente" não precisa de JS se o `href` já está no HTML.
// btnNew?.addEventListener('click', ...);

/* ========================= Inicializa ========================= */
// Inicia todo o processo quando o script é carregado
fetchAndRender();