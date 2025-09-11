// /js/crud-pacientes.js
/* ========================= Imports (API) ========================= */
import { listPacientes, deletePaciente, createPaciente, getPaciente } from './pacientesService.js';

/* ========================= Seletores / Estado ========================= */
const SEL = {
  tbody: '#tbody',
  pager: '#pager',
  search: '#q',
  count: '#countLabel',
  btnNew: '#btnNew',
  topNavLinks: '.top-nav a'
};

const $  = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>[...p.querySelectorAll(s)];
const byId = (id)=>document.getElementById(id);

const tbody      = $(SEL.tbody);
const pager      = $(SEL.pager);
const q          = $(SEL.search);
const countLabel = $(SEL.count);
const btnNew     = $(SEL.btnNew);

let pacientes = []; // cache do que veio da API (normalizado)
let filtro = '';
let page = 1;
const perPage = 10;

/* ========================= Helpers (strings/datas) ========================= */
function normalize(s){ return (s||'').toString().toLowerCase(); }
function fmtIndex(n){ return String(n).padStart(3,'0'); }

function parseDateSmart(v){
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); // DD/MM/YYYY
  if (m) {
    let dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) return d;
    return null;
  }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); // YYYY-MM-DD
  if (m) {
    const yyyy = +m[1], mm = +m[2], dd = +m[3];
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) return d;
    return null;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function formatData(input){
  const d = parseDateSmart(input);
  return d
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '—';
}
function calcIdade(input){
  const d = parseDateSmart(input);
  if (!d) return null;
  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - d.getUTCFullYear();
  const m = hoje.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && hoje.getUTCDate() < d.getUTCDate())) idade--;
  return idade;
}
function normalizaGenero(g){
  if (!g) return null;
  const s = String(g).trim().toLowerCase();
  if (['m','masc','masculino','homem'].includes(s)) return 'Masculino';
  if (['f','fem','feminino','mulher'].includes(s)) return 'Feminino';
  return String(g);
}
function formatCPF(v){
  if(!v) return "—";
  const only = String(v).replace(/\D/g,'').padStart(11,'0').slice(-11);
  return only.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
}
function iniciais(nome){
  if(!nome) return "PT";
  return nome.split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
}

/* ========================= Normalização API -> View ========================= */
function fromApi(p) {
  // garante campos para tabela/carteirinha independente do shape exato
  return {
    id: p.id,
    nome: p.nome ?? p.nome_completo ?? '',
    nomeSocial: p.nome_social ?? p.nomeSocial ?? '',
    cpf: p.cpf ?? '',
    contato: {
      email: p.email ?? p.contato?.email ?? '',
      celular: p.telefone ?? p.contato?.celular ?? p.contato?.tel1 ?? p.contato?.tel2 ?? ''
    },
    endereco: {
      cidade: p.endereco?.cidade ?? p.cidade ?? '',
      uf: p.endereco?.estado ?? p.uf ?? p.estado ?? ''
    },
    dataNascimento: p.data_nascimento ?? p.nasc ?? p.dataNascimento ?? '',
    ultimaConsulta: p.ultima_consulta ?? p.ultimaConsulta ?? '',
    proximaConsulta: p.proxima_consulta ?? p.proximaConsulta ?? '',
    genero: p.genero ?? p.sexo ?? '',
    observacoes: p.observacoes ?? p.obs ?? '',
    status: p.status ?? ''
  };
}

function blobPaciente(p){
  return normalize(`
    ${p.nome||''} ${p.nomeSocial||''} ${p.cpf||''}
    ${p.contato?.email||''} ${p.contato?.celular||''}
    ${p.endereco?.cidade||''} ${p.endereco?.uf||''}
  `);
}

/* ========================= Botão: Novo Paciente (cria na API) ========================= */
function gerarNovoPaciente() {
  const hoje = new Date();
  const yyyy = hoje.getFullYear() - 30;
  const mm = String(hoje.getMonth() + 1).padStart(2, '0');
  const dd = String(hoje.getDate()).padStart(2, '0');

  return {
    nome: 'Paciente Novo',
    nome_social: 'Novo',
    cpf: '111.222.333-44',              // troque por CPF válido se sua API validar
    rg: '00.000.000-0',
    sexo: 'não informado',
    data_nascimento: `${yyyy}-${mm}-${dd}`,
    profissao: '—',
    estado_civil: 'solteiro(a)',
    contato: { email: 'novo@exemplo.com', celular: '+55 (00) 00000-0000' },
    endereco: {
      cep: '00000-000', logradouro: '—', numero: '—',
      bairro: '—', cidade: '—', estado: '—'
    },
    observacoes: 'Registro criado automaticamente pelo botão "Novo paciente".'
  };
}

async function criarEIrParaCadastro() {
  try {
    btnNew?.setAttribute('aria-busy', 'true');
    btnNew?.classList.add('is-busy');
    btnNew && (btnNew.style.pointerEvents = 'none');

    const novo = await createPaciente(gerarNovoPaciente());
    const newId = novo?.id;
    if (!newId) throw new Error('A API não retornou o ID do novo paciente.');
    location.href = `cadastro.html?id=${encodeURIComponent(newId)}`;
  } catch (err) {
    console.error(err);
    alert(`Falha ao criar paciente: ${err.message}`);
    location.href = 'cadastro.html';
  } finally {
    btnNew?.removeAttribute('aria-busy');
    btnNew?.classList.remove('is-busy');
    if (btnNew) btnNew.style.pointerEvents = '';
  }
}

btnNew?.addEventListener('click', (ev)=>{ ev.preventDefault(); criarEIrParaCadastro(); });

/* ========================= Render (lista/paginação/contador) ========================= */
function render(){
  // filtro local (client-side). Se quiser, mude para query no servidor.
  const term = normalize(filtro);
  const list = term ? pacientes.filter(p => blobPaciente(p).includes(term)) : pacientes.slice();

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;

  const start = (page - 1) * perPage;
  const rows = list.slice(start, start + perPage);

  // tabela
  if (tbody) {
    tbody.innerHTML = rows.length ? rows.map((p, i) => `
      <tr>
        <td>${fmtIndex(start + i + 1)}</td>
        <td>
          ${p.nome || '—'}
          ${p.nomeSocial ? `<div style="font-size:12px;color:#64748b">(${p.nomeSocial})</div>` : ''}
        </td>
        <td>${p.cpf || '—'}</td>
        <td>${p.contato?.email || '—'}</td>
        <td>${p.contato?.celular || '—'}</td>
        <td>${p.endereco?.cidade ? `${p.endereco.cidade}${p.endereco.uf ? '/' + p.endereco.uf : ''}` : '—'}</td>
        <td class="col-actions" style="text-align:right; white-space:nowrap;">
          <button class="page-btn btn-view" type="button" data-id="${p.id}" title="Ver carteirinha" aria-label="Ver carteirinha">👁️</button>
          <button class="page-btn btn-edit" type="button" data-id="${p.id}" title="Editar">✏️</button>
          <button class="page-btn btn-del"  type="button" data-id="${p.id}" title="Excluir">🗑️</button>
        </td>
      </tr>
    `).join('') : `
      <tr><td colspan="7" style="padding:16px;color:#64748b">Sem pacientes cadastrados.</td></tr>
    `;
  }

  // ações (delegadas depois do render)
  $$('[data-id].btn-edit').forEach(b => b.onclick = () => onEdit(b.dataset.id));
  $$('[data-id].btn-del').forEach(b  => b.onclick = () => onDelete(b.dataset.id));
  $$('[data-id].btn-view').forEach(b => b.onclick = () => onView(b.dataset.id));

  // paginação
  if (pager) {
    pager.innerHTML = `
      <button class="page-btn" ${page<=1?'disabled':''} id="pgPrev">«</button>
      ${Array.from({length: pages}, (_, i) =>
        `<button class="page-btn ${i+1===page?'active':''}" data-page="${i+1}">${i+1}</button>`
      ).join('')}
      <button class="page-btn" ${page>=pages?'disabled':''} id="pgNext">»</button>
    `;
    $('#pgPrev')?.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
    $('#pgNext')?.addEventListener('click', ()=>{ if(page<pages){ page++; render(); } });
    $$('[data-page]').forEach(btn => btn.addEventListener('click', ()=>{ page = +btn.dataset.page; render(); }));
  }

  // contador
  if (countLabel) {
    const showing = rows.length;
    countLabel.textContent = `Mostrando ${showing} de ${total} paciente(s)`;
  }
}

/* ========================= Carregar dados da API ========================= */
async function fetchAndRender(initialQuery=''){
  try {
    // busca no servidor (seu service já desempacota { rows })
    const { rows } = await listPacientes({ q: initialQuery });
    // normaliza para o shape usado pela UI
    pacientes = rows.map(fromApi);

    // ordena por próxima consulta (opcional)
    pacientes.sort((a,b) => new Date(a.proximaConsulta||'9999-12-31') - new Date(b.proximaConsulta||'9999-12-31'));

    render();
  } catch (err) {
    console.error(err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:16px;color:#ef4444">Erro ao carregar: ${err.message}</td></tr>`;
  }
}

/* ========================= Ações ========================= */
function onEdit(id){ window.location.href = `cadastro.html?id=${encodeURIComponent(id)}`; }

async function onDelete(id){
  if(!confirm('Deseja excluir este paciente?')) return;
  try {
    await deletePaciente(id);
    // remove do cache local e re-renderiza
    pacientes = pacientes.filter(p => String(p.id) !== String(id));
    render();
  } catch (e) {
    console.error(e);
    alert('Falha ao excluir paciente.');
  }
}

async function onView(id){
  try{
    // tenta no cache (lista) primeiro
    let p = pacientes.find(x => String(x.id) === String(id));
    if (!p) {
      const apiItem = await getPaciente(id);
      p = fromApi(apiItem || {});
    }
    abrirCarteirinha(p);
  }catch(e){
    console.error(e);
    alert('Não foi possível carregar os dados deste paciente.');
  }
}

/* ========================= Eventos UI ========================= */
q?.addEventListener('input', () => { filtro = q.value || ''; page = 1; render(); });

/* ========================= Inicializa (carrega da API) ========================= */
fetchAndRender();

/* ========================= MODAL Carteirinha ========================= */
const overlay  = document.getElementById('carteirinha-overlay');
const closeBtn = document.querySelector('.close-btn');

function cId(id){ return document.getElementById(id); }

function preencherCarteirinha(p){
  if(!p){
    alert('Não foi possível encontrar este paciente.');
    return;
  }
  const nascimento =
    p.dataNascimento ?? p.nascimento ?? p.dataNasc ?? p.dtNascimento ??
    p.data_nascimento ?? p.dataDeNascimento ?? p.dt_nasc ?? p.nasc;

  const genero =
    p.genero ?? p.sexo ?? p.generoBiologico ?? p.genero_identidade ?? p['gênero'];

  const obs =
    p.observacoes ?? p.obs ?? p.anotacoes ?? p.observacao ?? p.notas;

  const idadeCalc = nascimento ? calcIdade(nascimento) : null;
  const idadeTxt  = (idadeCalc != null) ? `${idadeCalc} anos` : '—';

  cId('c-nome')       && (cId('c-nome').textContent        = p.nome || '—');
  cId('c-idade')      && (cId('c-idade').textContent       = idadeTxt);
  cId('c-genero')     && (cId('c-genero').textContent      = normalizaGenero(genero) || '—');
  cId('c-cpf')        && (cId('c-cpf').textContent         = formatCPF(p.cpf));
  cId('c-ultima')     && (cId('c-ultima').textContent      = formatData(p.ultimaConsulta ?? p.ultima_consulta ?? p.ultConsulta));
  cId('c-proxima')    && (cId('c-proxima').textContent     = formatData(p.proximaConsulta ?? p.proxima_consulta ?? p.proxConsulta));
  cId('c-observacoes')&& (cId('c-observacoes').textContent = obs || '—');
  cId('c-iniciais')   && (cId('c-iniciais').textContent    = iniciais(p.nome));

  const chipStatus = document.getElementById('chip-status');
  if (chipStatus) chipStatus.textContent = p.status ? `Paciente ${String(p.status).toLowerCase()}` : 'Paciente ativo';

  const chipProx = document.getElementById('chip-prox');
  const dProx = p.proximaConsulta ?? p.proxima_consulta ?? p.proxConsulta;
  if (chipProx) chipProx.textContent = dProx ? `Próx.: ${formatData(dProx)}` : '—';
}

function abrirCarteirinha(paciente){
  if (!overlay) {
    alert('Estrutura da carteirinha não está no HTML desta página.');
    console.warn('⚠️ Elemento #carteirinha-overlay não encontrado no DOM.');
    return;
  }
  preencherCarteirinha(paciente);
  overlay.setAttribute('aria-hidden','false');

  const card = document.getElementById('carteirinha');
  if (card) {
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'cardEnter .35s cubic-bezier(.22,.9,.27,1.05) forwards';
  }
}
function fecharCarteirinha(){ overlay?.setAttribute('aria-hidden','true'); }

closeBtn?.addEventListener('click', fecharCarteirinha);
overlay?.addEventListener('click', (e)=>{ if(e.target === overlay) fecharCarteirinha(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') fecharCarteirinha(); });

document.getElementById('btn-copiar')?.addEventListener('click', async ()=>{
  const texto =
`Nome: ${byId('c-nome')?.textContent||''}
Idade: ${byId('c-idade')?.textContent||''}
Gênero: ${byId('c-genero')?.textContent||''}
CPF: ${byId('c-cpf')?.textContent||''}
Última consulta: ${byId('c-ultima')?.textContent||''}
Próxima consulta: ${byId('c-proxima')?.textContent||''}
Observações: ${byId('c-observacoes')?.textContent||''}`;
  try{
    await navigator.clipboard.writeText(texto);
    alert('Dados copiados! ✅');
  }catch{
    alert('Não foi possível copiar.');
  }
});
document.getElementById('btn-imprimir')?.addEventListener('click', ()=>{ window.print(); });
