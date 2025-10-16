// 1. IMPORTAÇÕES (no topo do ficheiro)
import { createPaciente, getPaciente, updatePaciente } from './pacientesService.js';

// ======================================================================
//  SEU CÓDIGO DE HELPERS E MÁSCARAS (mantido como estava)
// ======================================================================
function toISODate(v) { 
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return '';
    // Ajusta para o fuso horário local para evitar problemas de "um dia a menos"
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
}
const $ = (s, p = document) => p.querySelector(s);
function onlyDigits(v) { return (v || '').replace(/\D+/g, ''); }
function maskCPF(v) { v = onlyDigits(v).slice(0, 11); return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }
// ... (cole aqui suas outras funções helper: maskCEP, isValidCPF, toast, etc.)

// ======================================================================
//  LÓGICA UNIFICADA PARA CRIAR E EDITAR PACIENTES
// ======================================================================

// Pega os elementos do HTML uma vez só
const form = document.getElementById('patientForm');
const params = new URLSearchParams(window.location.search);
const editingId = params.get('id'); // Pega o ID da URL. Se não houver, será null.

/**
 * Preenche o formulário com os dados do paciente vindos da API.
 * @param {object} paciente - Objeto do paciente.
 */
function preencherFormulario(paciente) {
    // Itera sobre os dados do paciente e preenche os campos correspondentes
    for (const [key, value] of Object.entries(paciente)) {
        const input = document.getElementById(key);
        if (input) {
            if (input.type === 'date') {
                input.value = toISODate(value);
            } else if (key === 'cpf') {
                input.value = maskCPF(value);
            }
             else {
                input.value = value;
            }
        }
    }
    // Lógica para campos especiais como radio buttons (sexo)
    if (paciente.sex) {
        const radio = document.querySelector(`input[name="sex"][value="${paciente.sex}"]`);
        if (radio) radio.checked = true;
    }
}

/**
 * Lê os dados do formulário e cria o objeto para enviar à API.
 */
function getFormData() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Limpeza e formatação dos dados antes de enviar
    data.cpf = onlyDigits(data.cpf);
    // Adicione outras normalizações se necessário
    
    return data;
}

/**
 * Função principal que é executada quando a página carrega.
 */
async function inicializarPagina() {
    if (editingId) {
        // --- MODO EDIÇÃO ---
        document.querySelector('.brand-title').textContent = 'Editar Paciente';
        try {
            const paciente = await getPaciente(editingId);
            if (paciente) {
                preencherFormulario(paciente);
            } else {
                alert('Paciente não encontrado!');
            }
        } catch (error) {
            console.error('Erro ao carregar paciente:', error);
            alert('Falha ao carregar os dados do paciente.');
        }
    } else {
        // --- MODO CRIAÇÃO ---
        document.querySelector('.brand-title').textContent = 'Novo Paciente';
    }
}

/**
 * Função chamada quando o formulário é enviado (botão "Salvar" clicado).
 */
async function salvar(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btnSave');
    
    const dadosPaciente = getFormData();

    // Validação
    if (!dadosPaciente.full_name || !isValidCPF(dadosPaciente.cpf)) {
        alert("Nome e CPF válido são obrigatórios.");
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
        if (editingId) {
            // Se temos um ID, estamos ATUALIZANDO
            await updatePaciente(editingId, dadosPaciente);
            alert('Paciente atualizado com sucesso!');
        } else {
            // Se não temos um ID, estamos CRIANDO
            await createPaciente(dadosPaciente);
            alert('Paciente cadastrado com sucesso!');
        }
        
        // Redireciona de volta para a lista
        window.location.href = 'pacientes.html'; // ❗️ Verifique o nome do seu ficheiro de listagem

    } catch (error) {
        console.error('Erro ao salvar paciente:', error);
        alert(`Ocorreu um erro ao salvar: ${error.message}`);
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar';
    }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
form.addEventListener('submit', salvar);
document.getElementById('btnCancel').addEventListener('click', () => {
    if (confirm("Cancelar e voltar à lista?")) {
        window.location.href = 'pacientes.html';
    }
});

// Roda a inicialização da página
inicializarPagina();
