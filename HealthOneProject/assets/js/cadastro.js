
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

/* ========================= Edição via ?id= (Carregamento da Página) ========================= */

// Pega o ID da URL. Se não houver, 'editingId' será null.
const params = new URLSearchParams(window.location.search);
const editingId = params.get('id');

/**
 * Preenche o formulário com dados de um paciente vindo da API.
 */
function preencherFormulario(paciente) {
    // ❗️ Garanta que os IDs dos inputs e os nomes dos campos da API estão corretos.
    $('#nome').value = paciente.full_name || '';
    $('#cpf').value = maskCPF(paciente.cpf || ''); // Usa sua função de máscara
    $('#email').value = paciente.email || '';
    $('#celular').value = paciente.phone_mobile || '';
    $('#nasc').value = paciente.birth_date || '';
    $('#cidade').value = paciente.city || '';
    $('#uf').value = paciente.state || '';
    // Continue para outros campos do seu formulário...
}

/**
 * Função principal que roda para inicializar a página.
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
                toast('Paciente não encontrado.', false);
            }
        } catch (error) {
            toast('Falha ao carregar dados do paciente.', false);
            console.error(error);
        }
    } else {
        // --- MODO CRIAÇÃO ---
        document.querySelector('.brand-title').textContent = 'Novo Paciente';
    }
}

// Roda a função de inicialização assim que a página carrega.
inicializarPagina();
/* ========================= Salvar / Cancelar ========================= */

// Usa o evento de 'submit' do formulário, que é mais robusto
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // Impede o recarregamento da página

  const btn = $('#btnSave');
  const dadosPaciente = getFormData();

  // Validação (usando seus helpers!)
  if (!dadosPaciente.full_name) {
    toast('Por favor, preencha o nome do paciente.', false);
    return;
  }
  if (!isValidCPF(dadosPaciente.cpf)) {
    toast('Por favor, preencha um CPF válido.', false);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    if (editingId) {
      // Se a variável 'editingId' existe (veio da URL), estamos ATUALIZANDO
      await updatePaciente(editingId, dadosPaciente);
      toast('Paciente atualizado com sucesso!');
    } else {
      // Se não, estamos CRIANDO um novo paciente
      await createPaciente(dadosPaciente);
      toast('Paciente cadastrado com sucesso!');
    }

    // Redireciona de volta para a lista após o sucesso
    setTimeout(() => {
      window.location.href = '../../Secretaria/pacientes.html'; // ❗️ Verifique o caminho
    }, 1500);

  } catch (error) {
    console.error('Erro ao salvar paciente:', error);
    if (error.message && error.message.includes('duplicate key value')) {
        toast('Este CPF já está cadastrado no sistema.', false);
    } else {
        toast(`Falha ao salvar: ${error.message}`, false);
    }
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

// Lógica do botão Cancelar (separada e mais simples)
$('#btnCancel').addEventListener('click', () => {
  if (confirm('Cancelar e voltar à lista?')) {
    window.location.href = '../../Secretaria/pacientes.html'; // ❗️ Verifique o caminho
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


