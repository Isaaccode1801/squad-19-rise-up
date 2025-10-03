// =========================================================================
//         ARQUIVO: novo-laudo.js (VERSÃO FINAL COM MAPEAMENTO CORRETO)
// =========================================================================

// 1. Importa as ferramentas da API
import { createLaudo, listPacientes } from './pacientesService.js'; // ❗️ Verifique o caminho

// --- Seletores do HTML ---
const selectPaciente = document.getElementById('paciente-id');
const btnSalvar = document.querySelector('.btn-salvar');
const btnCancelar = document.querySelector('.btn-cancelar');
const form = document.getElementById('form-novo-laudo'); // Garanta que seu <form> tenha este ID

// --- Funções Auxiliares ---

function execCmd(command) { document.execCommand(command, false, null); }
window.execCmd = execCmd; // Disponibiliza para o HTML

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

/**
 * Combina uma data (YYYY-MM-DD) e uma hora (HH:mm) em um formato ISO 8601 completo.
 */
function combinarDataEHora(data, hora) {
    if (!data || !hora) return null;
    // Retorna a data no formato que a API espera: 2024-02-15T10:30:00Z
    return `${data}T${hora}:00Z`; 
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
 * Função principal para salvar o laudo.
 */
// =========================================================================
//         SUBSTITUA SUA FUNÇÃO salvarLaudo PELA VERSÃO ABAIXO
// =========================================================================

async function salvarLaudo(event) {
  event.preventDefault(); // Impede o recarregamento da página

  // --- 1. LEITURA DOS DADOS ---
  // Esta parte já estava funcionando corretamente.
  const dadosDoLaudo = {
    patient_id: document.getElementById('paciente-id').value,
    exam: document.getElementById('exame').value,
    requested_by: document.getElementById('solicitante')?.value || null,
    content_html: document.getElementById('laudo-conteudo').innerHTML,
    status: document.getElementById('laudo-status').value,
    hide_signature: !document.getElementById('assinatura').checked,
    due_at: combinarDataEHora(document.getElementById('prazo').value, document.getElementById('hora').value),
    order_number: `REL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
  };

  // --- 2. VALIDAÇÃO DOS DADOS ---
  if (!dadosDoLaudo.patient_id || !dadosDoLaudo.exam) {
    alert("Paciente e Título do Exame são obrigatórios!");
    return; // Para a execução se a validação falhar
  }
  
  // --- 3. LÓGICA DE ENVIO (A PARTE QUE FALTAVA) ---
  const btnSalvar = document.querySelector('.btn-salvar');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';

  try {
    // Chama a função do service para criar o laudo na API
    await createLaudo(dadosDoLaudo);
    
    // Se a linha acima não der erro, o processo foi um sucesso
    alert("Laudo criado com sucesso!");
    window.location.href = 'Laudo.html'; // Redireciona de volta para a lista

  } catch (error) {
    // Se a API retornar um erro, ele será capturado aqui
    console.error("Erro ao salvar o laudo:", error);
    alert(`Falha ao criar o laudo: ${error.message}`);
    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Salvar';
  }
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---
form.addEventListener('submit', salvarLaudo);

btnCancelar.addEventListener('click', () => {
  if (confirm("Deseja cancelar a criação do laudo?")) {
    window.location.href = 'Laudo.html';
  }
});

preencherHoras();
popularPacientes();