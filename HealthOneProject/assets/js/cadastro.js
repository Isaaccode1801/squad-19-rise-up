
import { createPaciente, getPaciente, updatePaciente } from './pacientesService.js';
/* ========================= Helpers ========================= */
// datas: aceita DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, YYYY/M/D
function parseDateSmart(v){
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); // DD/MM/YYYY
  if (m){
    let dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(Date.UTC(yyyy, mm-1, dd));
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm-1 && d.getUTCDate() === dd) return d;
    return null;
  }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); // YYYY-MM-DD
  if (m){
    const yyyy = +m[1], mm = +m[2], dd = +m[3];
    const d = new Date(Date.UTC(yyyy, mm-1, dd));
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm-1 && d.getUTCDate() === dd) return d;
    return null;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function toISODate(v){ // 'YYYY-MM-DD' p/ <input type="date">
  const d = parseDateSmart(v);
  if (!d) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

const $  = (s,p=document)=>p.querySelector(s);
const $$ = (s,p=document)=>[...p.querySelectorAll(s)];
function onlyDigits(v){ return (v||'').replace(/\D+/g,''); }
function maskCPF(v){ v = onlyDigits(v).slice(0,11); return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function maskCEP(v){ v = onlyDigits(v).slice(0,8); return v.replace(/(\d{5})(\d)/,'$1-$2'); }
function maskPhoneBRIntl(v){
  v = onlyDigits(v);
  if(!v.startsWith('55')) v = '55'+v;
  v = v.slice(0,13);
  const ddi=v.slice(0,2), ddd=v.slice(2,4), rest=v.slice(4);
  if(rest.length>9) return `+${ddi} (${ddd}) ${rest.slice(0,5)}-${rest.slice(5,9)}`;
  if(rest.length>4) return `+${ddi} (${ddd}) ${rest.slice(0,4)}-${rest.slice(4,8)}`;
  if(ddd) return `+${ddi} (${ddd}) ${rest}`;
  return `+${ddi}`;
}
function isValidCPF(raw){
  const s = onlyDigits(raw);
  if(s.length!==11) return false;
  if(/^([0-9])\1+$/.test(s)) return false;
  let sum=0; for(let i=0;i<9;i++) sum+=parseInt(s[i])*(10-i);
  let d1=(sum*10)%11; if(d1===10) d1=0; if(d1!==parseInt(s[9])) return false;
  sum=0; for(let i=0;i<10;i++) sum+=parseInt(s[i])*(11-i);
  let d2=(sum*10)%11; if(d2===10) d2=0; if(d2!==parseInt(s[10])) return false;
  return true;
}
function toast(msg, ok=true){
  const t = $('#toast'); t.textContent = msg;
  t.style.borderColor = ok? '#10b981':'#ef4444';
  t.classList.add('show'); setTimeout(()=> t.classList.remove('show'), 2200);
}

/* ========================= Upload de avatar ========================= */
const photoInput = $('#photo');
const avatar = $('#avatarPreview');
$('#btnUpload').addEventListener('click', ()=> photoInput.click());
photoInput.addEventListener('change', ()=>{
  const f = photoInput.files?.[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = e => { avatar.innerHTML = `<img alt="Foto do paciente" src="${e.target.result}"/>`; };
  reader.readAsDataURL(f);
});

/* ========================= Interações de campos ========================= */
const rnToggle = $('#rnToggle');
rnToggle?.addEventListener('click', ()=> rnToggle.classList.toggle('active'));
rnToggle?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); rnToggle.click(); } });

const docTipo = $('#docTipo');
const docNumero = $('#docNumero');
docTipo.addEventListener('change', ()=>{
  docNumero.disabled = !docTipo.value;
  docNumero.placeholder = docTipo.value ? `Número do ${docTipo.value}` : 'Preencha após selecionar o tipo';
});

const temResp = $('#temResponsavel');
const respNome = $('#responsavel');
const respCpf  = $('#cpfResponsavel');
temResp.addEventListener('change', ()=>{
  const on = temResp.value==='sim';
  respNome.disabled = respCpf.disabled = !on;
  if(!on){ respNome.value=''; respCpf.value=''; }
});

// máscaras
const cpf = $('#cpf'); cpf.addEventListener('input', ()=> cpf.value = maskCPF(cpf.value));
const cpfResp = $('#cpfResponsavel'); cpfResp.addEventListener('input', ()=> cpfResp.value = maskCPF(cpfResp.value));
const celular = $('#celular'); const tel1=$('#tel1'); const tel2=$('#tel2');
;[celular,tel1,tel2].forEach(el=> el.addEventListener('input', ()=> el.value = maskPhoneBRIntl(el.value)));
const cep = $('#cep'); cep.addEventListener('input', ()=> cep.value = maskCEP(cep.value));

// validações
const email = $('#email');
email.addEventListener('blur', ()=> $('#err-email').textContent = (email.value && !email.checkValidity()) ? 'Formato de e-mail inválido.' : '');
cpf.addEventListener('blur', ()=> $('#err-cpf').textContent = (cpf.value && !isValidCPF(cpf.value)) ? 'CPF inválido.' : '');

// ViaCEP
async function buscarCEP(v){
  const s = onlyDigits(v); if(s.length!==8) return;
  try{
    const res = await fetch(`https://viacep.com.br/ws/${s}/json/`);
    const data = await res.json();
    if(data.erro){ $('#err-cep').textContent='CEP não encontrado.'; return; }
    $('#err-cep').textContent='';
    $('#logradouro').value = data.logradouro || '';
    $('#bairro').value     = data.bairro     || '';
    $('#cidade').value     = data.localidade || '';
    $('#uf').value         = data.uf         || '';
  }catch{ $('#err-cep').textContent='Falha ao consultar CEP.'; }
}
cep.addEventListener('blur', ()=> buscarCEP(cep.value));

/* ========================= Coletar dados / validar ========================= */
const form = $('#patientForm');
function getFormData() {
  // Pega os valores dos inputs
  const nome = $('#nome').value.trim();
  const cpf = onlyDigits($('#cpf').value);
  const email = $('#email').value.trim();
  const dataNascimento = $('#nasc').value; // Formato YYYY-MM-DD
  const telefone = $('#celular').value.trim();
  const cidade = $('#cidade').value.trim();
  const uf = $('#uf').value.trim();

  // Monta o objeto EXATAMENTE como a API espera
  return {
    full_name: nome,
    cpf: cpf,
    email: email,
    birth_date: dataNascimento, // Nome do campo na API é 'birth_date'
    phone_mobile: telefone,    // Nome do campo na API é 'phone_mobile'
    city: cidade,              // Nome do campo na API é 'city'
    state: uf,                 // Nome do campo na API é 'state' ou 'uf' (verifique na sua tabela)
    // Adicione outros campos que sua API espera aqui
  };
}
function validateBeforeSave(data){
  let ok=true;
  if(!data.nome){ $('#err-nome').textContent='Informe o nome.'; ok=false; } else { $('#err-nome').textContent=''; }
  if(data.cpf && !isValidCPF(data.cpf)){ $('#err-cpf').textContent='CPF inválido.'; ok=false; } else { $('#err-cpf').textContent=''; }
  if(data.contato.email && !email.checkValidity()){ $('#err-email').textContent='Formato de e-mail inválido.'; ok=false; } else { $('#err-email').textContent=''; }
  if(data.responsavel.ativo){
    if(!data.responsavel.nome){ ok=false; toast('Informe o nome do responsável.', false); }
    if(data.responsavel.cpf && !isValidCPF(data.responsavel.cpf)){ ok=false; toast('CPF do responsável inválido.', false); }
  }
  return ok;
}
function renderPreview(obj){
  const el = document.querySelector('#jsonPreview');
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}

/* ========================= Edição via ?id= ========================= */
let editingId = null;
(function hydrateIfEditing(){
  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  if(!idParam) return;         // sem id = novo
  const id = String(idParam);  // mantém string
  const lista = loadPacientes();
  const p = lista.find(x => String(x.id) === id);
  if(!p) return;

  editingId = id;

  // Preenche campos
  $('#nome').value = p.nome||'';
  $('#nomeSocial').value = p.nomeSocial||'';
  $('#cpf').value = p.cpf||'';
  $('#rg').value = p.rg||'';
  $('#docTipo').value = p.doc?.tipo||'';
  $('#docNumero').value = p.doc?.numero||''; $('#docNumero').disabled = !p.doc?.tipo;
  if(p.sexo){ const el = document.querySelector(`input[name="sexo"][value="${p.sexo}"]`); el && (el.checked=true); }
  $('#nasc').value = toISODate(p.nasc || p.dataNascimento) || '';
  $('#raca').value = p.raca||'';
  $('#etnia').value = p.etnia||'';
  $('#naturalidade').value = p.naturalidade||'';
  $('#nacionalidade').value = p.nacionalidade||'';
  $('#profissao').value = p.profissao||'';
  $('#estadoCivil').value = p.estadoCivil||'';
  $('#mae').value = p.filiacao?.mae||'';
  $('#profMae').value = p.filiacao?.profMae||'';
  $('#pai').value = p.filiacao?.pai||'';
  $('#profPai').value = p.filiacao?.profPai||'';
  $('#temResponsavel').value = p.responsavel?.ativo ? 'sim' : 'nao';
  const on = p.responsavel?.ativo; $('#responsavel').disabled = $('#cpfResponsavel').disabled = !on;
  $('#responsavel').value = p.responsavel?.nome||'';
  $('#cpfResponsavel').value = p.responsavel?.cpf||'';
  if(p.rnGuia) $('#rnToggle')?.classList.add('active');
  $('#codigoLegado').value = p.codigoLegado||'';
  $('#obs').value = p.obs||'';
  $('#email').value = p.contato?.email||'';
  $('#celular').value = p.contato?.celular||'';
  $('#tel1').value = p.contato?.tel1||'';
  $('#tel2').value = p.contato?.tel2||'';
  $('#cep').value = p.endereco?.cep||'';
  $('#logradouro').value = p.endereco?.logradouro||'';
  $('#numero').value = p.endereco?.numero||'';
  $('#complemento').value = p.endereco?.complemento||'';
  $('#bairro').value = p.endereco?.bairro||'';
  $('#cidade').value = p.endereco?.cidade||'';
  $('#uf').value = p.endereco?.uf||'';
  $('#referencia').value = p.endereco?.referencia||'';

  // ✅ Consultas (pré-preencher)
  $('#ultimaConsulta').value  = toISODate(p.ultimaConsulta  ?? p.ultima_consulta  ?? p.ultConsulta) || '';
  $('#proximaConsulta').value = toISODate(p.proximaConsulta ?? p.proxima_consulta ?? p.proxConsulta) || '';

  renderPreview(p);
})();

/* ========================= Salvar / Cancelar ========================= */
/* ========================= Salvar / Cancelar ========================= */

// Usamos 'async' para poder usar 'await' dentro da função
$('#btnSave').addEventListener('click', async () => {
  const btn = $('#btnSave');
  try {
    const dadosPaciente = getFormData();

    // Validação básica (você pode usar sua função validateBeforeSave aqui se quiser)
    if (!dadosPaciente.full_name || !dadosPaciente.cpf) {
      toast('Nome e CPF são obrigatórios.', false);
      return;
    }

    // Desabilita o botão para evitar cliques duplos
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    // A MÁGICA ACONTECE AQUI!
    // Chama a função 'createPaciente' do seu service e espera a resposta.
    await createPaciente(dadosPaciente);

    // Se chegou até aqui, deu tudo certo!
    toast('Paciente cadastrado com sucesso!', true);

    // Redireciona para a lista de pacientes após um pequeno intervalo
    setTimeout(() => {
      window.location.href = '../../Secretaria/pacientes.html'; // Verifique se o nome do arquivo está correto
    }, 1000);

  } catch (error) {
    console.error('Erro ao cadastrar paciente:', error);
    toast(`Falha ao cadastrar: ${error.message}`, false);
    
    // Habilita o botão novamente em caso de erro
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

$('#btnCancel').addEventListener('click', () => {
  if (confirm('Cancelar e voltar à lista?')) {
    window.location.href = '../../Secretaria/pacientes.html'; // Verifique o nome do arquivo
  }
});
/* ========================= UI ========================= */
(function highlightActive(){
  const cur = 'cadastro';
  document.querySelectorAll('.top-nav a').forEach(a=>{
    if(a.dataset.page===cur) a.classList.add('active');
  });
})();

/* ========================= Anexos (mock local) ========================= */
const anexosLista = $('#anexosLista');
const anexosInput = $('#anexosInput');
$('#btnAddAnexos').addEventListener('click', ()=> anexosInput.click());
anexosInput.addEventListener('change', ()=>{
  [...anexosInput.files].forEach(f=> addAnexo(f));
  anexosInput.value='';
});
function addAnexo(file){
  const row = document.createElement('div');
  row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed #eef2f7';
  const left = document.createElement('div');
  left.innerHTML = `<strong>${file.name}</strong><div class="muted" style="font-size:12px">${new Date().toLocaleString()}</div>`;
  const right = document.createElement('div');
  const btn = document.createElement('button');
  btn.className='btn secondary'; btn.type='button'; btn.textContent='Excluir';
  btn.addEventListener('click', ()=> row.remove());
  right.appendChild(btn);
  row.append(left, right);
  anexosLista.appendChild(row);
}



const $form = document.querySelector('#patientForm');
const params = new URLSearchParams(location.search);
const id = params.get('id');

function fillForm(obj = {}) {
  Object.entries(obj).forEach(([k, v]) => {
    const el = $form.elements.namedItem(k);
    if (el) el.value = v ?? '';
  });
}

async function load() {
  if (!id) return;
  try {
    const p = await getPaciente(id);
    if (!p) return alert('Paciente não encontrado');
    fillForm(p);
  } catch (e) {
    console.error(e);
    alert('Erro ao carregar paciente');
  }
}

$form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = Object.fromEntries(new FormData($form));
  try {
    if (id) await updatePaciente(id, data);
    else await createPaciente(data);
    alert('Salvo com sucesso!');
    location.href = '../../Secretaria/pacientes.html';
  } catch (e) {
    console.error(e);
    alert(`Erro ao salvar: ${e.message}`);
  }
});

load();
