import { listPacientes, deletePaciente } from './pacientesService.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- IMPORTS E SELETORES ---
    // (Esta parte pode precisar de um ajuste de caminho se o seu service estiver em outro local)
    // 
    
    const tbody = document.getElementById('tbody');
    const countLabel = document.getElementById('countLabel');
    // Adicione outros seletores se necessário (ex: para filtros)
    
    let todosPacientes = []; // Guarda a lista de pacientes vinda da API

    // --- FUNÇÕES HELPER (Auxiliares) ---
    function formatCPF(v) {
        if (!v) return "—";
        const only = String(v).replace(/\D/g, '').padStart(11, '0').slice(-11);
        return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    function calcIdade(input) {
        if (!input) return null;
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
        return nome.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    }
    function formatData(input) {
        if (!input) return '—';
        const d = new Date(input);
        if (isNaN(d)) return '—';
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
    }

    // --- LÓGICA DA PÁGINA PRINCIPAL ---

    async function fetchAndRender() {
        try {
            tbody.innerHTML = `<tr><td colspan="7">Carregando pacientes...</td></tr>`;
            
          const pacientesDaApi = await listPacientes();
            

            todosPacientes = pacientesDaApi;
            render();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: red;">Erro ao carregar a lista de pacientes. Verifique o console.</td></tr>`;
            console.error(err);
        }
    }

    function render() {
        if (!countLabel) return; // Segurança para evitar erros
        countLabel.textContent = `Mostrando ${todosPacientes.length} paciente(s)`;

        if (todosPacientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">Nenhum paciente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = todosPacientes.map((p, i) => `
            <tr class="row">
                <td>${i + 1}</td>
                <td>${p.full_name || '—'}</td>
                <td>${p.cpf ? formatCPF(p.cpf) : '—'}</td>
                <td>${p.email || '—'}</td>
                <td>${p.phone_mobile || '—'}</td>
                <td>${p.city ? `${p.city}/${p.state || ''}` : '—'}</td>
                <td class="col-actions">
                    <button class="page-btn btn-view" data-id="${p.id}" title="Ver carteirinha">👁️</button>
                    <a href="../../medico/tabela-pacientes/cadastro.html?id=${p.id}" class="page-btn btn-edit" title="Editar">✏️</a>
                    <button class="page-btn btn-del" data-id="${p.id}" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');

        // Conecta os botões de Ação às suas funções após serem criados
        document.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => onView(btn.dataset.id)));
        document.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', () => onDelete(btn.dataset.id)));
    }

    // --- FUNÇÕES DE AÇÃO DOS BOTÕES ---
    
    function onView(id) {
        const paciente = todosPacientes.find(p => p.id == id);
        if (paciente) {
            abrirCarteirinha(paciente);
        } else {
            alert('Dados do paciente não encontrados.');
        }
    }

    async function onDelete(id) {
        if (confirm('Tem certeza que deseja excluir este paciente?')) {
            alert(`Ação de deletar o paciente com ID ${id}. (Conecte à sua API aqui)`);
            // Exemplo de como seria com a API:
            // try {
            //     await deletePaciente(id);
            //     fetchAndRender(); // Recarrega a lista
            // } catch(err) {
            //     alert(`Falha ao excluir: ${err.message}`);
            // }
        }
    }

    // --- LÓGICA DO MODAL DA CARTEIRINHA ---
    const overlay = document.getElementById('carteirinha-overlay');
    const closeBtn = document.querySelector('.close-btn');

    function preencherCarteirinha(p) {
        document.getElementById('c-nome').textContent = p.full_name || '—';
        document.getElementById('c-iniciais').textContent = p.full_name ? iniciais(p.full_name) : '??';
        document.getElementById('c-cpf').textContent = p.cpf ? formatCPF(p.cpf) : '—';
        const idade = calcIdade(p.birth_date);
        document.getElementById('c-idade').textContent = idade !== null ? `${idade} anos` : '—';
        
        document.getElementById('c-genero').textContent = p.gender || 'Não informado';
        document.getElementById('c-ultima').textContent = formatData(p.last_appointment) || '—';
        document.getElementById('c-proxima').textContent = formatData(p.next_appointment) || '—';
        document.getElementById('c-observacoes').textContent = p.observations || 'Nenhuma observação.';
    }

    function abrirCarteirinha(paciente) {
        if (!overlay) return;
        preencherCarteirinha(paciente);
        overlay.setAttribute('aria-hidden', 'false');
    }

    function fecharCarteirinha() {
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'true');
    }
    
    // Eventos para fechar o modal
    closeBtn?.addEventListener('click', fecharCarteirinha);
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) fecharCarteirinha();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharCarteirinha();
    });

    // --- INICIALIZAÇÃO ---
    fetchAndRender();

});

