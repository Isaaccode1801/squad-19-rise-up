// =========================================================================
//         ARQUIVO: editar-laudo.js (Cérebro da Página de Edição)
// =========================================================================

// 1. Importa as ferramentas que vamos usar da nossa "caixa de ferramentas"
import { getLaudo, updateLaudo, listPacientes } from './pacientesService.js';

// --- Seletores e Estado da Página ---
const form = document.getElementById('form-editar-laudo'); // ❗️ Garanta que seu <form> tenha este ID
const selectPaciente = document.getElementById('paciente-id');
const btnSalvar = document.querySelector('.btn-salvar');
const btnCancelar = document.querySelector('.btn-cancelar');
const params = new URLSearchParams(window.location.search);
const laudoId = params.get('id'); // O ID do laudo que estamos editando

// --- Funções Auxiliares ---
function preencherHoras() {
  const selectHora = document.getElementById("hora");
  if (!selectHora) return;
  for (let h = 8; h <= 22; h++) {
    ["00","30"].forEach(min => {
      if(h === 22 && min === "30") return;
      const o = document.createElement("option");
      o.value = `${String(h).padStart(2,"0")}:${min}`;
      o.textContent = o.value;
      selectHora.appendChild(o);
    });
  }
}
function combinarDataEHora(data, hora) {
  if (!data || !hora) return null;
  return `${data}T${hora}:00Z`;
}

/**
 * Preenche o formulário com os dados do laudo vindo da API.
 */
function preencherFormulario(laudo) {
    selectPaciente.value = laudo.patient_id;
    document.getElementById('solicitante').value = laudo.requested_by || '';
    document.getElementById('exame').value = laudo.exam || '';
    document.getElementById('laudo-conteudo').innerHTML = laudo.content_html || '';
    // document.getElementById('laudo-status').value = laudo.status || 'draft'; // Se você tiver o campo status
    document.getElementById('assinatura').checked = !laudo.hide_signature;

    if (laudo.due_at) {
        const dataHora = new Date(laudo.due_at);
        document.getElementById('prazo').value = dataHora.toISOString().split('T')[0];
        document.getElementById('hora').value = dataHora.toTimeString().substring(0, 5);
    }
}

/**
 * Busca a lista de pacientes e preenche o menu dropdown.
 */
async function popularPacientes() {
  try {
    const pacientes = await listPacientes();
    selectPaciente.innerHTML = '<option value="">Selecione um paciente</option>'; 
    pacientes.forEach(paciente => {
      const option = document.createElement('option');
      option.value = paciente.id;
      option.textContent = paciente.full_name;
      selectPaciente.appendChild(option);
    });
  } catch (error) {
    console.error("Falha ao carregar lista de pacientes:", error);
    selectPaciente.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
  }
}

/**
 * Função principal para salvar as alterações do laudo.
 */
async function salvarAlteracoes(event) {
    event.preventDefault();
    
    // Coleta os dados do formulário
    const dadosDoLaudo = {
        patient_id: document.getElementById('paciente-id').value,
        exam: document.getElementById('exame').value,
        requested_by: document.getElementById('solicitante').value,
        content_html: document.getElementById('laudo-conteudo').innerHTML,
        // status: document.getElementById('laudo-status').value, // Se tiver o campo status
        hide_signature: !document.getElementById('assinatura').checked,
        due_at: combinarDataEHora(document.getElementById('prazo').value, document.getElementById('hora').value),
    };

    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Atualizando...';

    try {
        await updateLaudo(laudoId, dadosDoLaudo);
        alert('Laudo atualizado com sucesso!');
        window.location.href = 'Laudo.html';
    } catch (error) {
        alert(`Falha ao atualizar o laudo: ${error.message}`);
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Alterações';
    }
}

/**
 * Função que inicializa a página de edição.
 */
async function inicializarPaginaDeEdicao() {
    if (!laudoId) {
        alert("ID do laudo não encontrado na URL. Voltando para a lista.");
        window.location.href = 'Laudo.html';
        return;
    }
    
    document.querySelector('h1').textContent = `Editar Laudo #${laudoId.substring(0, 8)}...`;

    preencherHoras();
    // Primeiro, popula a lista de pacientes.
    await popularPacientes(); 
    
    // Depois, busca os dados do laudo específico.
    try {
        const laudo = await getLaudo(laudoId);
        if (laudo) {
            preencherFormulario(laudo); // E preenche o formulário com os dados
        } else {
            alert("Laudo não encontrado na API.");
        }
    } catch (error) {
        alert("Erro ao carregar os dados do laudo.");
    }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
form.addEventListener('submit', salvarAlteracoes);
btnCancelar.addEventListener('click', () => { 
    if (confirm("Descartar alterações e voltar para a lista?")) {
        window.location.href = 'Laudo.html'; 
    }
});

// Disponibiliza a função do editor para o HTML
window.execCmd = (command) => document.execCommand(command, false, null);

// Roda a inicialização da página
inicializarPaginaDeEdicao();