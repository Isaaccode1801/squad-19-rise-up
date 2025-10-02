// assets/js/crud-pacientes.js (VERSÃO CORRIGIDA)

/* ========================= Imports (API) ========================= */
// CORREÇÃO 1: Removido 'deletePaciente' que não existe no seu service.
//             Adicionado 'updatePaciente' que pode ser útil.
import { listPacientes, createPaciente, getPaciente, updatePaciente } from './pacientesService.js';

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

/* ========================= Ações dos Botões ========================= */

// Ação de deletar (exemplo, precisa da função no service)
async function onDelete(id) {
  if (!confirm('Deseja realmente excluir este paciente?')) return;
  alert(`Funcionalidade de deletar o paciente com ID ${id} ainda não implementada.`);
  // try {
  //   await deletePaciente(id); // Você precisaria criar a função deletePaciente no service
  //   fetchAndRender(); // Recarrega a lista
  // } catch (e) {
  //   alert('Falha ao excluir paciente.');
  // }
}

// Ação de visualizar (exemplo, não implementado no seu HTML)
function onView(id) {
  const paciente = todosPacientes.find(p => p.id == id);
  if (paciente) {
    alert(`Visualizando dados de: ${paciente.name}`);
    // Aqui viria a lógica para abrir o modal da carteirinha
  }
}

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