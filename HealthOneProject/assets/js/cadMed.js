import { createPaciente, getPaciente, updatePaciente, getHeaders as getAuthHeaders } from './pacientesService.js';

/* ========================= Helpers ========================= */
// datas: aceita DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, YYYY/M/D
function parseDateSmart(v){
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();

  // DD/MM/YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m){
    let dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(Date.UTC(yyyy, mm-1, dd));
    if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm-1 && d.getUTCDate() === dd) return d;
    return null;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
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
  const t = $('#toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg;
  t.style.borderColor = ok? '#10b981':'#ef4444';
  t.classList.add('show'); setTimeout(()=> t.classList.remove('show'), 2200);
}

// helpers de set
function setValById(id, value){
  const el = document.getElementById(id);
  if (el) el.value = value;
}
function setVal(sel, value){
  const el = document.querySelector(sel);
  if (el) el.value = value;
}
function setRadioByName(name, value){
  $$(`input[name="${name}"]`).forEach(r=>{
    r.checked = (String(r.value).toLowerCase() === String(value||'').toLowerCase());
  });
}
function getRadioVal(name){
  const r = $(`input[name="${name}"]:checked`);
  return r ? r.value : '';
}

// === troque o getEditId + editingId por isto ===

// Pega o id da URL (se houver)
const urlIdParam = new URLSearchParams(location.search).get('id');

// Consome (lê e apaga) o id de edição salvo em sessão
function consumeEditId() {
  try {
    const id = sessionStorage.getItem('edit_patient_id');
    sessionStorage.removeItem('edit_patient_id'); // <- apaga logo após ler
    return id;
  } catch {
    return null;
  }
}

// Se tiver id na URL usa ele; senão tenta consumir da sessão; senão null
const editingId = urlIdParam || consumeEditId();
/* ============ Fetch paciente by id (campos completos) ============ */
async function fetchPacienteById(id) {
  const API_BASE = 'https://yuanqfswhberkoevtmfr.supabase.co';
  const url = `${API_BASE}/rest/v1/patients?id=eq.${encodeURIComponent(id)}&select=*`;
  const resp = await fetch(url, { headers: getAuthHeaders() });
  if (!resp.ok) throw new Error(`Falha ao buscar paciente (${resp.status})`);
  const arr = await resp.json();
  return arr[0] || null;
}

/* ========================= Upload de avatar ========================= */
const photoInput = $('#photo');
const avatar = $('#avatarPreview');
const btnUpload = $('#btnUpload');
if (btnUpload && photoInput) {
  btnUpload.addEventListener('click', ()=> photoInput.click());
  photoInput.addEventListener('change', ()=>{
    const f = photoInput.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = e => { if (avatar) avatar.innerHTML = `<img alt="Foto do paciente" src="${e.target.result}"/>`; };
    reader.readAsDataURL(f);
  });
}

/* ========================= Interações de campos ========================= */
const rnToggle = $('#rnToggle');
rnToggle?.addEventListener('click', ()=> rnToggle.classList.toggle('active'));
rnToggle?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); rnToggle.click(); } });

const docTipo = $('#docTipo');
const docNumero = $('#docNumero');
if (docTipo && docNumero) {
  docNumero.disabled = !docTipo.value;
  docTipo.addEventListener('change', ()=>{
    docNumero.disabled = !docTipo.value;
    docNumero.placeholder = docTipo.value ? `Número do ${docTipo.value}` : 'Preencha após selecionar o tipo';
  });
}

const temResp = $('#temResponsavel');
const respNome = $('#responsavel');
const respCpf  = $('#cpfResponsavel');
if (temResp && respNome && respCpf) {
  temResp.addEventListener('change', ()=>{
    const on = temResp.value==='sim';
    respNome.disabled = respCpf.disabled = !on;
    if(!on){ respNome.value=''; respCpf.value=''; }
  });
}

// máscaras
const cpf = $('#cpf');
if (cpf) cpf.addEventListener('input', ()=> cpf.value = maskCPF(cpf.value));

const cpfResp = $('#cpfResponsavel');
if (cpfResp) cpfResp.addEventListener('input', ()=> cpfResp.value = maskCPF(cpfResp.value));

const celular = $('#celular');
const tel1 = $('#tel1');
const tel2 = $('#tel2');
[celular, tel1, tel2].forEach(el=> { if (el) el.addEventListener('input', ()=> el.value = maskPhoneBRIntl(el.value)); });

const cep = $('#cep');
if (cep) {
  cep.addEventListener('input', ()=> cep.value = maskCEP(cep.value));
}

// Cálculo automático de IMC (peso / altura^2)
(function bindAutoBMI(){
  const pesoEl = $('#peso');
  const altEl  = $('#altura');
  const imcEl  = $('#imc');
  if(!pesoEl || !altEl || !imcEl) return;

  function calcBMI(){
    const p = Number(String(pesoEl.value).replace(',','.'));
    const a = Number(String(altEl.value).replace(',','.'));
    if(p>0 && a>0){
      imcEl.value = (p/(a*a)).toFixed(1).replace('.', ',');
    }
  }
  pesoEl.addEventListener('input', calcBMI);
  altEl.addEventListener('input', calcBMI);
})();

// validações
const email = $('#email');
if (email) email.addEventListener('blur', ()=> $('#err-email') && ($('#err-email').textContent = (email.value && !email.checkValidity()) ? 'Formato de e-mail inválido.' : ''));
if (cpf) cpf.addEventListener('blur', ()=> $('#err-cpf') && ($('#err-cpf').textContent = (cpf.value && !isValidCPF(cpf.value)) ? 'CPF inválido.' : ''));

// ViaCEP
async function buscarCEP(v){
  const s = onlyDigits(v); if(s.length!==8) return;
  try{
    const res = await fetch(`https://viacep.com.br/ws/${s}/json/`);
    const data = await res.json();
    const errEl = $('#err-cep');
    if (data.erro){ if (errEl) errEl.textContent='CEP não encontrado.'; return; }
    if (errEl) errEl.textContent='';
    const lg = $('#logradouro'); if (lg) lg.value = data.logradouro || '';
    const br = $('#bairro');     if (br) br.value = data.bairro     || '';
    const cd = $('#cidade');     if (cd) cd.value = data.localidade || '';
    const uf = $('#uf');         if (uf) uf.value = data.uf         || '';
  }catch{ const errEl = $('#err-cep'); if (errEl) errEl.textContent='Falha ao consultar CEP.'; }
}
if (cep) cep.addEventListener('blur', ()=> buscarCEP(cep.value));

/* ========================= Coletar dados / validar ========================= */
const form = $('#patientForm');
function getVal(sel){
  const el = document.querySelector(sel);
  return el ? el.value : '';
}
function getFormData() {
  const nome         = (getVal('#nome') || '').trim();
  const nomeSocial   = (getVal('#nomeSocial') || '').trim();
  const cpfVal       = onlyDigits(getVal('#cpf'));
  const emailVal     = (getVal('#email') || '').trim();

  const nascVal      = (getVal('#nasc') || '').trim(); // YYYY-MM-DD
  const celularVal   = (getVal('#celular') || '').trim();

  // Endereço (IDs usados pela ViaCEP)
  const cepVal        = onlyDigits(getVal('#cep'));
  const logradouroVal = (getVal('#logradouro') || '').trim();
  const numeroVal     = (getVal('#numero') || '').trim();
  const complVal      = (getVal('#complemento') || '').trim();
  const bairroVal     = (getVal('#bairro') || '').trim();
  const cidadeVal     = (getVal('#cidade') || '').trim();
  const ufVal         = (getVal('#uf') || '').trim();

  // Dados clínicos
  // tenta radio 'sex', se não houver usa select #sexo
  const sexoRadio = getRadioVal('sex');
  const sexoVal   = (sexoRadio || getVal('#sexo') || '').trim();
  const sangueVal = (getVal('#tipoSanguineo') || '').trim();
  const pesoStr   = (getVal('#peso') || '').trim();
  const alturaStr = (getVal('#altura') || '').trim();

  const pesoKg  = pesoStr   ? Number(String(pesoStr).replace(',', '.'))   : null;
  const alturaM = alturaStr ? Number(String(alturaStr).replace(',', '.')) : null;

  // Calcula BMI localmente se vierem peso/altura; se existir um input #imc, respeita o valor digitado
  let bmiVal = (getVal('#imc') || '').trim();
  if ((!bmiVal || isNaN(Number(bmiVal))) && pesoKg && alturaM && alturaM > 0) {
    bmiVal = (pesoKg / (alturaM * alturaM)).toFixed(1);
  }
  const bmi = bmiVal ? Number(String(bmiVal).replace(',', '.')) : null;

  return {
    full_name: nome,
    social_name: nomeSocial || null,
    cpf: cpfVal || null,
    email: emailVal || null,
    phone_mobile: celularVal || null,
    birth_date: nascVal || null,

    sex: sexoVal || null,
    blood_type: sangueVal || null,
    weight_kg: (typeof pesoKg === 'number' && !Number.isNaN(pesoKg)) ? pesoKg : null,
    height_m: (typeof alturaM === 'number' && !Number.isNaN(alturaM)) ? alturaM : null,
    bmi: (typeof bmi === 'number' && !Number.isNaN(bmi)) ? bmi : null,

    cep: cepVal || null,
    street: logradouroVal || null,
    number: numeroVal || null,
    complement: complVal || null,
    neighborhood: bairroVal || null,
    city: cidadeVal || null,
    state: ufVal || null,
  };
}
function validateBeforeSave(data){
  let ok = true;

  const errNome = document.querySelector('#err-nome');
  if(!data.full_name){
    if (errNome) errNome.textContent = 'Informe o nome.';
    ok = false;
  } else if (errNome) { errNome.textContent = ''; }

  const errCpf = document.querySelector('#err-cpf');
  if(data.cpf && !isValidCPF(data.cpf)){
    if (errCpf) errCpf.textContent = 'CPF inválido.';
    ok = false;
  } else if (errCpf) { errCpf.textContent = ''; }

  const emailInput = document.querySelector('#email');
  const errEmail = document.querySelector('#err-email');
  if(data.email && emailInput && !emailInput.checkValidity()){
    if (errEmail) errEmail.textContent = 'Formato de e-mail inválido.';
    ok = false;
  } else if (errEmail) { errEmail.textContent = ''; }

  const nascInput = document.querySelector('#nasc');
  if(nascInput && nascInput.hasAttribute('required') && !data.birth_date){
    toast('Informe a data de nascimento.', false);
    ok = false;
  }

  return ok;
}
function renderPreview(obj){
  const el = document.querySelector('#jsonPreview');
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}


/**
 * Preenche o formulário com dados de um paciente vindo da API.
 * Versão com normalização de data, fallback de telefone e máscaras.
 */
function preencherFormulario(paciente) {
  if (!paciente || typeof paciente !== 'object') return;

  // Dados básicos
  setVal('#nome', paciente.full_name || '');
  setValById('nome', paciente.full_name || '');
  setVal('#nomeSocial', paciente.social_name || '');
  setValById('nomeSocial', paciente.social_name || '');
  setVal('#cpf', maskCPF(paciente.cpf || ''));
  setValById('cpf', maskCPF(paciente.cpf || ''));
  setVal('#email', paciente.email || '');
  setValById('email', paciente.email || '');

  // Telefone
  const phoneFmt = maskPhoneBRIntl(paciente.phone_mobile || paciente.phone || '');
  setVal('#celular', phoneFmt);
  setValById('celular', phoneFmt);

  // Data de nascimento -> input type="date" exige YYYY-MM-DD
  const nascIso = toISODate(paciente.birth_date || '');
  setVal('#nasc', nascIso);
  setValById('nasc', nascIso);

  // Clínico
  // sex pode ser radio (name="sex") OU select #sexo
  if ($$('input[name="sex"]').length){
    setRadioByName('sex', paciente.sex || '');
  }
  setVal('#sexo', paciente.sex || '');
  setValById('sexo', paciente.sex || '');

  // tipo sanguíneo (select)
  const tipoSel = $('#tipoSanguineo');
  if (tipoSel) {
    const optExists = [...tipoSel.options].some(o => String(o.value).toUpperCase() === String(paciente.blood_type||'').toUpperCase());
    tipoSel.value = optExists ? paciente.blood_type : '';
  }
  setValById('tipoSanguineo', tipoSel ? tipoSel.value : (paciente.blood_type || ''));

  // Peso/Altura/IMC (mostrando com vírgula se desejar)
  const pesoStr = (paciente.weight_kg ?? '') === '' ? '' : String(paciente.weight_kg).replace('.', ',');
  const altStr  = (paciente.height_m ?? '') === '' ? '' : String(paciente.height_m).replace('.', ',');
  let imcStr    = (paciente.bmi       ?? '') === '' ? '' : String(paciente.bmi).replace('.', ',');
  if (!imcStr && paciente.weight_kg && paciente.height_m){
    const bmi = (paciente.weight_kg / (paciente.height_m*paciente.height_m));
    imcStr = bmi ? String(bmi.toFixed(1)).replace('.', ',') : '';
  }
  setVal('#peso', pesoStr);   setValById('peso', pesoStr);
  setVal('#altura', altStr);  setValById('altura', altStr);
  setVal('#imc', imcStr);     setValById('imc', imcStr);

  // Endereço (IDs usados pela ViaCEP)
  setVal('#cep', maskCEP(paciente.cep || ''));     setValById('cep', maskCEP(paciente.cep || ''));
  setVal('#logradouro', paciente.street || '');    setValById('logradouro', paciente.street || '');
  setVal('#numero', paciente.number || '');        setValById('numero', paciente.number || '');
  setVal('#complemento', paciente.complement || ''); setValById('complemento', paciente.complement || '');
  setVal('#bairro', paciente.neighborhood || '');  setValById('bairro', paciente.neighborhood || '');
  setVal('#cidade', paciente.city || '');          setValById('cidade', paciente.city || '');
  setVal('#uf', paciente.state || '');             setValById('uf', paciente.state || '');
}

/**
 * Função principal que roda para inicializar a página.
 */
async function inicializarPagina() {
  try {
    console.debug('[cadastro] editingId:', editingId);
    if (editingId) {
      // --- MODO EDIÇÃO ---
      const brand = document.querySelector('.brand-title');
      if (brand) brand.textContent = 'Editar Paciente';

      const paciente = await fetchPacienteById(editingId);
      console.debug('[cadastro] paciente carregado:', paciente);

      if (paciente && typeof paciente === 'object') {
        preencherFormulario(paciente);
      } else {
        toast('Paciente não encontrado.', false);
      }
    } else {
      // --- MODO CRIAÇÃO ---
      const brand2 = document.querySelector('.brand-title');
      if (brand2) brand2.textContent = 'Novo Paciente';

      // limpa qualquer resquício de sessão
      try { sessionStorage.removeItem('edit_patient_id'); } catch {}

      // limpa o formulário por garantia
      const formEl = document.querySelector('#patientForm');
      if (formEl) formEl.reset();

      // limpa campos que têm máscara manual
      setVal('#cpf',''); setVal('#celular',''); setVal('#cep','');
      setVal('#peso',''); setVal('#altura',''); setVal('#imc','');
      setVal('#numero',''); setVal('#complemento','');
    }
  } catch (error) {
    console.error('[cadastro] falha ao inicializar:', error);
    toast('Falha ao carregar dados do paciente.', false);
  }
}

/* ========================= Salvar / Cancelar ========================= */
function handleSubmit(event){
  event.preventDefault();
  const btn = document.querySelector('#btnSave');
  const dadosPaciente = getFormData();

  if (!validateBeforeSave(dadosPaciente)) return;
  if (!dadosPaciente.cpf || !isValidCPF(dadosPaciente.cpf)){
    toast('Por favor, preencha um CPF válido.', false);
    return;
  }

  if (btn){ btn.disabled = true; btn.textContent = 'Salvando...'; }

  (async () => {
    try {
      if (editingId) {
        await updatePaciente(editingId, dadosPaciente);
        toast('Paciente atualizado com sucesso!');
      } else {
        await createPaciente(dadosPaciente);
        toast('Paciente cadastrado com sucesso!');
      }
      setTimeout(() => {
        const dest = new URL('./crud-pacientes.html', window.location.href).toString();
        window.location.assign(dest);
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      if (error.message && /duplicate key value/i.test(error.message)) {
        toast('Este CPF já está cadastrado no sistema.', false);
      } else {
        toast(`Falha ao salvar: ${error.message}`, false);
      }
      if (btn){ btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  })();
}

/* ========================= Init bindings ========================= */
document.addEventListener('DOMContentLoaded', () => {
  inicializarPagina();

  const formEl = document.querySelector('#patientForm');
  if (formEl) formEl.addEventListener('submit', handleSubmit);

  const btnCancel = document.getElementById('btnCancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Cancelar e voltar à lista?')) {
        const dest = new URL('./crud-pacientes.html', window.location.href).toString();
        window.location.assign(dest);
      }
    });
  }
});

/* ========================= UI ========================= */
(function highlightActive(){
  const cur = 'cadastro';
  document.querySelectorAll('.top-nav a').forEach(a=>{
    if(a?.dataset?.page===cur) a.classList.add('active');
  });
})();

/* ========================= Anexos (mock local) ========================= */
const anexosLista = $('#anexosLista');
const anexosInput = $('#anexosInput');
const btnAddAnexos = $('#btnAddAnexos');
if (btnAddAnexos && anexosInput) {
  btnAddAnexos.addEventListener('click', ()=> anexosInput.click());
}
if (anexosInput) {
  anexosInput.addEventListener('change', ()=>{
    [...(anexosInput.files || [])].forEach(f=> addAnexo(f));
    anexosInput.value='';
  });
}
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
  if (anexosLista) anexosLista.appendChild(row);
}
