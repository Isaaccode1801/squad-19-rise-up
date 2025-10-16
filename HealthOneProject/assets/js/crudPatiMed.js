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
                    <button class="page-btn btn-edit" data-id="${p.id}" title="Editar">✏️</button>
                    <button class="page-btn btn-del" data-id="${p.id}" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');

        // Conecta os botões de Ação às suas funções após serem criados
        document.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => onView(btn.dataset.id)));
        document.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', () => onDelete(btn.dataset.id)));
        document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => onEdit(btn.dataset.id)));
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

  function toProjectUrl(relPath) {
    // Gera URL absoluta a partir do caminho relativo
    // Ex.: "cadastro.html?id=..." resolve relativo ao arquivo atual
    return new URL(relPath, window.location.href).toString();
  }

function onEdit(id) {
  if (!id) { alert('ID do paciente inválido.'); return; }
  // ⬇️ mantém o id acessível mesmo se o ?id=... não vier
  try { sessionStorage.setItem('edit_patient_id', id); } catch {}
  const dest = toProjectUrl(`../../Secretaria/cadastro.html?id=${encodeURIComponent(id)}`);
  window.location.assign(dest);
}

async function onDelete(id) {
  if (!id) { alert('ID do paciente inválido.'); return; }
  const ok = confirm('Tem certeza que deseja excluir este paciente?');
  if (!ok) return;

  let btnDel = document.querySelector(`.btn-del[data-id="${id}"]`);
  const originalLabel = btnDel ? btnDel.textContent : null;
  if (btnDel) { btnDel.disabled = true; btnDel.textContent = 'Excluindo...'; }

  try {
    const result = await deletePaciente(id); // ← agora devolve {mode:'hard'|'soft'}
    // remove da lista local
    todosPacientes = todosPacientes.filter(p => String(p.id) !== String(id));
    render();

    if (result?.mode === 'soft') {
      alert('Paciente arquivado (soft delete) pois há registros vinculados.');
    }
  } catch (err) {
    console.error('[pacientes] falha ao excluir', err);
    alert(`Falha ao excluir: ${err?.message || 'erro desconhecido'}`);
    if (btnDel) { btnDel.disabled = false; btnDel.textContent = originalLabel || 'Excluir'; }
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

  const btn = document.getElementById("btnAcessibilidade");
  const menu = document.getElementById("menuAcessibilidade");

  if (!btn && !menu) {
    // elementos de acessibilidade não existem nesta página; seguir sem inicializar o menu
  }

  if (btn && menu) {
    // Alternar visibilidade do menu
    btn.addEventListener("click", () => {
      menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    });

    // Fechar se clicar fora
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  // Funções de acessibilidade
  const corpo = document.body;

// Função para salvar estado no localStorage
function salvarPreferencia(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

// Função para carregar estado salvo
function carregarPreferencia(chave) {
  const valor = localStorage.getItem(chave);
  return valor ? JSON.parse(valor) : false;
}

// ======== MODO ESCURO ========
const modoEscuroBtn = document.getElementById("modoEscuro");
let modoEscuroAtivo = carregarPreferencia("modoEscuro");

if (modoEscuroAtivo) document.body.classList.add("modo-escuro");

if (modoEscuroBtn) {
  modoEscuroBtn.addEventListener("click", () => {
    modoEscuroAtivo = !modoEscuroAtivo;
    document.body.classList.toggle("modo-escuro", modoEscuroAtivo);
    salvarPreferencia("modoEscuro", modoEscuroAtivo);
  });
}

// ======== MODO DALTÔNICO ========
const modoDaltonicoBtn = document.getElementById("modoDaltonico");
let modoDaltonicoAtivo = carregarPreferencia("modoDaltonico");

if (modoDaltonicoAtivo) document.body.classList.add("modo-daltonico");

if (modoDaltonicoBtn) {
  modoDaltonicoBtn.addEventListener("click", () => {
    modoDaltonicoAtivo = !modoDaltonicoAtivo;
    document.body.classList.toggle("modo-daltonico", modoDaltonicoAtivo);
    salvarPreferencia("modoDaltonico", modoDaltonicoAtivo);
  });
}

// ======== CONTROLE DE FONTE (ZOOM) ========

// Elementos
const aumentarFonteContainer = document.getElementById("aumentarFonteContainer");
const controlesFonte = document.getElementById("controlesFonte");
const btnMais = document.getElementById("aumentarFonte");
const btnMenos = document.getElementById("diminuirFonte");
const valorFonte = document.getElementById("tamanhoFonteValor");

// Estado inicial (carrega o último valor salvo)
let zoomPagina = carregarPreferencia("zoomPagina") || 100;

// Aplica o zoom salvo ao carregar
document.body.style.zoom = zoomPagina + "%";
if (valorFonte) valorFonte.textContent = `${zoomPagina}%`;

// Mostra/oculta os controles ao clicar no container
if (aumentarFonteContainer && controlesFonte) {
  aumentarFonteContainer.addEventListener("click", (e) => {
    e.stopPropagation();
    controlesFonte.classList.toggle("visivel");
  });
}

// Função para aplicar o zoom e salvar
function aplicarZoom() {
  document.body.style.zoom = zoomPagina + "%";
  if (valorFonte) valorFonte.textContent = `${zoomPagina}%`;
  salvarPreferencia("zoomPagina", zoomPagina);
}

// Botão ➕
if (btnMais) {
  btnMais.addEventListener("click", (e) => {
    e.stopPropagation();
    if (zoomPagina < 180) {
      zoomPagina += 10;
      aplicarZoom();
    }
  });
}

// Botão ➖
if (btnMenos) {
  btnMenos.addEventListener("click", (e) => {
    e.stopPropagation();
    if (zoomPagina > 80) {
      zoomPagina -= 10;
      aplicarZoom();
    }
  });
}

// ======== LEITOR DE TEXTO ========
const leitorBtn = document.getElementById("leitorTexto");
if (leitorBtn) {
  leitorBtn.addEventListener("click", () => {
    leitorAtivo = !leitorAtivo;
    salvarPreferencia("leitorTexto", leitorAtivo);
    alert(leitorAtivo ? "Leitor de texto ativado." : "Leitor de texto desativado.");
  });
}

let leitorAtivo = carregarPreferencia("leitorTexto");

document.addEventListener("mouseover", (e) => {
  if (leitorAtivo && e.target.textContent.trim().length > 0) {
    const texto = e.target.textContent.trim();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    speechSynthesis.cancel();
    speechSynthesis.speak(fala);
  }
});


    // --- INICIALIZAÇÃO ---
    fetchAndRender();

});
