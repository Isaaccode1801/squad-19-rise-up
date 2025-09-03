/* ========================= CRUD Pacientes — HealthOne ========================= */
const SEL = {
  tbody: '#tbody',
  pager: '#pager',
  search: '#q',
  count: '#countLabel',
  btnNew: '#btnNew',
  topNavLinks: '.top-nav a'
};

/* ========================= LocalStorage utils ========================= */
const LS_KEY_PACIENTES = 'healthone.pacientes';

// migra automaticamente da chave antiga 'pacientes' (se existir) para a nova
(function migrateFromOldKey(){
  const old = JSON.parse(localStorage.getItem('pacientes') || '[]');
  const cur = JSON.parse(localStorage.getItem(LS_KEY_PACIENTES) || '[]');
  if (old.length && !cur.length) {
    old.forEach(p => { p.id = p.id || (crypto?.randomUUID?.() || String(Date.now()+Math.floor(Math.random()*1000))); });
    localStorage.setItem(LS_KEY_PACIENTES, JSON.stringify(old));
    console.log('✅ Migração: dados movidos de "pacientes" para', LS_KEY_PACIENTES);
  }
})();

function loadPacientes() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_PACIENTES) || '[]'); }
  catch { return []; }
}
function setPacientes(arr){
  localStorage.setItem(LS_KEY_PACIENTES, JSON.stringify(arr));
  pacientes = arr;
}
function ensureId(p) {
  p.id = p.id || (crypto?.randomUUID?.() || String(Date.now() + Math.floor(Math.random()*1000)));
  return p;
}
function salvarPaciente(paciente) {
  ensureId(paciente);
  const arr = loadPacientes();
  const idx = arr.findIndex(x => String(x.id) === String(paciente.id));
  if (idx >= 0) arr[idx] = paciente; else arr.push(paciente);
  setPacientes(arr);
}

/* ========================= Estado / Referências ========================= */
let pacientes = loadPacientes();
let filtro = '';
let page = 1;
const perPage = 10;

const $  = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>[...p.querySelectorAll(s)];
const byId = (id)=>document.getElementById(id);

const tbody = $(SEL.tbody);
const pager = $(SEL.pager);
const q = $(SEL.search);
const countLabel = $(SEL.count);
const btnNew = $(SEL.btnNew);

/* ========================= Helpers ========================= */
function normalize(s){ return (s||'').toString().toLowerCase(); }
function blobPaciente(p){
  return normalize(`
    ${p.nome||''} ${p.nomeSocial||''} ${p.cpf||''}
    ${p.contato?.email||''} ${p.contato?.celular||''} ${p.contato?.tel1||''} ${p.contato?.tel2||''}
    ${p.endereco?.cidade||''} ${p.endereco?.uf||''}
  `);
}
function fmtIndex(n){ return String(n).padStart(3,'0'); }
function fmtCidadeUF(p){
  const c = p.endereco?.cidade || '—';
  const uf = p.endereco?.uf || '';
  return uf ? `${c}/${uf}` : c;
}

/* ========= Datas (robustas) ========= */
// aceita 1-2 dígitos e "/" ou "-"
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

/* ========================= Renderização ========================= */
function render() {
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
        <td>${p.contato?.celular || p.contato?.tel1 || p.contato?.tel2 || '—'}</td>
        <td>${fmtCidadeUF(p)}</td>
        <td class="col-actions">
          <button class="page-btn btn-view" type="button" data-id="${p.id}" title="Ver carteirinha" aria-label="Ver carteirinha">👁️</button>
          <button class="page-btn" type="button" data-edit="${p.id}" title="Editar">✏️</button>
          <button class="page-btn" type="button" data-del="${p.id}"  title="Excluir">🗑️</button>
        </td>
      </tr>
    `).join('') : `
      <tr><td colspan="7" style="padding:16px;color:#64748b">Sem pacientes cadastrados.</td></tr>
    `;
  }

  // ações (sem converter para número)
  $$('[data-edit]').forEach(b => b.onclick = () => onEdit(b.dataset.edit));
  $$('[data-del]').forEach(b => b.onclick = () => onDelete(b.dataset.del));

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

/* ========================= Ações ========================= */
function onView(id){
  const p = pacientes.find(x => String(x.id) === String(id));
  if (!p) return;
  alert(
`Paciente: ${p.nome}
Nome social: ${p.nomeSocial || '—'}
CPF: ${p.cpf || '—'}
E-mail: ${p.contato?.email || '—'}
Celular: ${p.contato?.celular || p.contato?.tel1 || p.contato?.tel2 || '—'}
Cidade/UF: ${fmtCidadeUF(p)}
Obs: ${p.obs || '—'}`
  );
}
function onEdit(id){ window.location.href = `cadastro.html?id=${id}`; }
function onDelete(id){
  if(!confirm('Deseja excluir este paciente?')) return;
  const nova = pacientes.filter(p => String(p.id) !== String(id));
  setPacientes(nova);
  render();
}

/* ========================= Eventos UI ========================= */
q?.addEventListener('input', () => { filtro = q.value || ''; page = 1; render(); });
btnNew?.addEventListener('click', ()=>{ /* navega normal para cadastro.html */ });

/* Atualiza se outro tab gravar novos pacientes */
window.addEventListener('storage', (e)=>{
  if(e.key === LS_KEY_PACIENTES){
    pacientes = loadPacientes();
    render();
  }
});

/* Inicializa */
render();

/* ========================= MODAL Carteirinha ========================= */
function getPacienteById(id){
  const arr = pacientes && pacientes.length ? pacientes : loadPacientes();
  return arr.find(p => String(p.id) === String(id)) || null;
}

// Elementos do modal (podem não existir nesta página)
const overlay  = document.getElementById('carteirinha-overlay');
const closeBtn = document.querySelector('.close-btn');

function cId(id){ return document.getElementById(id); }

function preencherCarteirinha(p){
  if(!p){
    alert('Não foi possível encontrar este paciente. Verifique se o ID existe no localStorage.');
    return;
  }
  const nascimento =
    p.dataNascimento ?? p.nascimento ?? p.dataNasc ?? p.dtNascimento ??
    p.data_nascimento ?? p.dataDeNascimento ?? p.dt_nasc ?? p.nasc;

  const genero =
    p.genero ?? p.sexo ?? p.generoBiologico ?? p.genero_identidade ?? p['gênero'];

  const obs =
    p.observacoes ?? p.obs ?? p.anotacoes ?? p.observacao ?? p.notas;

  const idadeCalc = nascimento ? calcIdade(nascimento) : (isFinite(+p.idade) ? +p.idade : null);
  const idadeTxt  = (idadeCalc != null) ? `${idadeCalc} anos` : '—';

  cId('c-nome')      && (cId('c-nome').textContent       = p.nome || '—');
  cId('c-idade')     && (cId('c-idade').textContent      = idadeTxt);
  cId('c-genero')    && (cId('c-genero').textContent     = normalizaGenero(genero) || '—');
  cId('c-cpf')       && (cId('c-cpf').textContent        = formatCPF(p.cpf));
  cId('c-ultima')    && (cId('c-ultima').textContent     = formatData(p.ultimaConsulta ?? p.ultima_consulta ?? p.ultConsulta));
  cId('c-proxima')   && (cId('c-proxima').textContent    = formatData(p.proximaConsulta ?? p.proxima_consulta ?? p.proxConsulta));
  cId('c-observacoes')&& (cId('c-observacoes').textContent = obs || '—');
  cId('c-iniciais')  && (cId('c-iniciais').textContent   = iniciais(p.nome));

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

// Clique no ícone 👁️ (delegado)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn-view');
  if(!btn) return;

  const id = btn.dataset.id;
  const paciente = getPacienteById(id);
  if (!paciente) {
    alert('Não foi possível encontrar este paciente. Verifique se o ID existe no localStorage.');
    return;
  }
  abrirCarteirinha(paciente);
});

// Fechar: X, overlay, Esc (com guards)
closeBtn?.addEventListener('click', fecharCarteirinha);
overlay?.addEventListener('click', (e)=>{ if(e.target === overlay) fecharCarteirinha(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') fecharCarteirinha(); });

// Ações do rodapé (com guards)
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
