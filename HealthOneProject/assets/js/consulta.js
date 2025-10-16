// HealthOneProject/assets/js/consulta.js
// Conecta a listagem de CONSULTAS ao Supabase (appointments + pacientes + médicos)

// ========================== CONFIG SUPABASE ==========================
const API_BASE_URL = 'https://yuanqfswhberkoevtmfr.supabase.co/rest/v1';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ';

function getAuthHeaders() {
  const token = localStorage.getItem('user_token') || '';
  return {
    'apikey': API_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ========================== HELPERS UI/DADOS ==========================
function fmtCPF(v) {
  const s = String(v || '').replace(/\D/g, '').slice(0, 11);
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '—';
}

function fmtPhone(v) {
  const s = String(v || '').replace(/\D/g, '');
  if (!s) return '—';
  if (s.length === 11) return s.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (s.length === 10) return s.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v;
}

function fmtDateTimeISO(iso) {
  try {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch { return iso || '—'; }
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function byIdMap(list) {
  const m = new Map();
  list.forEach(it => m.set(it.id, it));
  return m;
}

// Obtém com segurança o ID da consulta de uma linha (tr)
function getApptIdFromTr(tr) {
  if (!tr) return null;
  return tr.dataset.apptId
      || tr.getAttribute('data-appt-id')
      || tr.dataset.id
      || tr.getAttribute('data-id')
      || null;
}

// Monta filtro OR seguro para UUIDs: or=(id.eq.uuid1,id.eq.uuid2,...)
function buildOrIdFilter(ids, column = 'id') {
  if (!ids?.length) return '';
  const parts = ids
    .filter(Boolean)
    .map(id => `${column}.eq.${encodeURIComponent(id)}`);
  return `or=(${parts.join(',')})`;
}

// Divide um array em blocos menores para evitar URLs gigantes
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ========================== FETCHERS ==========================
async function fetchAppointments() {
  const url = `${API_BASE_URL}/appointments?select=id,patient_id,doctor_id,scheduled_at,status&order=scheduled_at.desc`;
  const resp = await fetch(url, { headers: getAuthHeaders() });
  if (!resp.ok) throw new Error(`Falha ao listar consultas (${resp.status})`);
  return resp.json();
}

async function fetchPatientsByIds(ids) {
  const clean = Array.from(new Set((ids || []).filter(Boolean)));
  if (!clean.length) return [];
  const batches = chunk(clean, 20); // evita URL muito longa
  const results = [];

  for (const batch of batches) {
    const filter = buildOrIdFilter(batch, 'id');
    const url = `${API_BASE_URL}/patients?select=id,full_name,cpf,phone_mobile,phone1,phone2&${filter}`;
    const resp = await fetch(url, { headers: getAuthHeaders() });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Falha ao listar pacientes (${resp.status}) ${txt}`);
    }
    const data = await resp.json();
    if (Array.isArray(data)) results.push(...data);
  }
  return results;
}

async function fetchDoctorsByIds(doctorIds) {
  const clean = Array.from(new Set((doctorIds || []).filter(Boolean)));
  if (!clean.length) return [];

  // Helper para normalizar campos do "médico" (independente do schema)
  const normalizeDoctor = (row) => ({
    id: row.id,
    full_name: row.full_name || row.name || row.profile_name || row.user_name || row.email || '—',
    email: row.email || row.user_email || null,
    phone: row.phone_mobile || row.phone || row.user_phone || null,
  });

  const results = [];

  // Tentativa A: tabela doctors (seleciona * para evitar 400 por coluna inexistente)
  try {
    const batches = chunk(clean, 20);
    for (const batch of batches) {
      const filter = buildOrIdFilter(batch, 'id');
      const urlA = `${API_BASE_URL}/doctors?select=*&${filter}`;
      const resA = await fetch(urlA, { headers: getAuthHeaders() });
      if (!resA.ok) {
        // Se for erro de relação/coluna (400/422), deixa o fallback tentar
        if (resA.status !== 404 && resA.status !== 400 && resA.status !== 422) {
          const txt = await resA.text().catch(() => '');
          console.warn('[fetchDoctorsByIds] doctors falhou:', resA.status, txt);
        }
      } else {
        const dataA = await resA.json();
        if (Array.isArray(dataA) && dataA.length) {
          results.push(...dataA.map(normalizeDoctor));
        }
      }
    }
    if (results.length) return results;
  } catch (e) {
    console.warn('[fetchDoctorsByIds] erro na tabela doctors:', e?.message || e);
  }

  // Tentativa B: fallback para profiles
  try {
    const batches = chunk(clean, 20);
    for (const batch of batches) {
      const filter = buildOrIdFilter(batch, 'id');
      const urlC = `${API_BASE_URL}/profiles?select=id,full_name,email,phone&${filter}`;
      const resC = await fetch(urlC, { headers: getAuthHeaders() });
      if (!resC.ok) {
        const txt = await resC.text().catch(() => '');
        throw new Error(`Falha no fallback profiles (${resC.status}) ${txt}`);
      }
      const dataC = await resC.json();
      if (Array.isArray(dataC)) {
        results.push(...dataC.map(normalizeDoctor));
      }
    }
  } catch (e) {
    console.error('[fetchDoctorsByIds] profiles fallback falhou:', e?.message || e);
  }

  return results;
}

// ========================== RENDER ==========================
function renderRows(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = '';
    return;
  }
  const html = rows.map(r => `
    <tr class="row" data-appt-id="${r.id || ''}">
      <td>${fmtCPF(r.cpf)}</td>
      <td>${r.paciente || '—'}</td>
      <td>${fmtPhone(r.phone)}</td>
      <td>${r.medico || '—'}</td>
      <td>${fmtDateTimeISO(r.scheduled_at)}</td>
      <td class="actions">
        <button type="button" class="btn-ico edit" data-action="edit" title="Editar" aria-label="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button type="button" class="btn-ico delete" data-action="delete" title="Excluir" aria-label="Excluir">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
  tbody.innerHTML = html;
}

// ========================== FLOW ==========================
async function carregarConsultasSupabase() {
  const consultasBody = document.getElementById('consultasBody');
  const note = document.getElementById('note');

  if (!consultasBody) {
    console.warn('[consultas] tbody #consultasBody não encontrado.');
    return;
  }

  // Estado: Carregando
  if (note) {
    note.textContent = 'Carregando consultas...';
    note.style.display = 'block';
  }

  try {
    // 1) Appointments
    const appts = await fetchAppointments();
    if (!Array.isArray(appts) || appts.length === 0) {
      consultasBody.innerHTML = '';
      if (note) {
        note.textContent = 'Nenhuma consulta agendada.';
        note.style.display = 'block';
      }
      return;
    }

    // 2) Busca pacientes e médicos
    const patientIds = uniq(appts.map(a => a.patient_id));
    const doctorIds  = uniq(appts.map(a => a.doctor_id));

    const [patients, doctors] = await Promise.all([
      fetchPatientsByIds(patientIds),
      fetchDoctorsByIds(doctorIds),
    ]);

    const pMap = byIdMap(patients);
    const dMap = byIdMap(doctors);

    // 3) Monta linhas para render
    const rows = appts.map(a => {
      const p = pMap.get(a.patient_id) || {};
      const d = dMap.get(a.doctor_id) || {};
      return {
        id: a.id,
        cpf: p.cpf,
        paciente: p.full_name,
        phone: p.phone_mobile || p.phone1 || p.phone2,
        medico: d.full_name || d.name || '—',
        scheduled_at: a.scheduled_at,
      };
    });

    // 4) Renderiza
    renderRows(consultasBody, rows);
    if (note) note.style.display = 'none';

  } catch (e) {
    console.error('[consultas] erro ao carregar:', e);
    if (note) {
      const msg = e?.message || 'Falha ao carregar consultas.';
      note.textContent = `${msg} Verifique se está logado e se o token tem permissão.`;
      note.style.display = 'block';
    }
  }
}

// ======= Ações de linha =======
async function deleteAppointment(id) {
  const url = `${API_BASE_URL}/appointments?id=eq.${encodeURIComponent(id)}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Prefer': 'return=minimal'
    }
  });
  if (!(resp.ok || resp.status === 204)) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Falha ao excluir (${resp.status}) ${txt}`);
  }
}

function onEditAppointment(id) {
  // Salva ID para a tela de edição abrir preenchida
  try { sessionStorage.setItem('edit_appointment_id', id); } catch {}
  // Ajuste o caminho conforme o seu arquivo real de "nova consulta"
  // Ex: 'Secretaria/secretaria.html' ou 'Secretaria/dash-secretaria.html'
  const target = 'Secretaria/secretaria.html#nova-consulta';
  window.location.href = target;
}

async function onDeleteAppointment(id) {
  if (!id) return;
  const ok = confirm('Tem certeza que deseja excluir esta consulta?');
  if (!ok) return;
  try {
    await deleteAppointment(id);
    // Recarrega a listagem
    await carregarConsultasSupabase();
  } catch (e) {
    console.error('[consultas] erro ao excluir:', e);
    alert(e?.message || 'Falha ao excluir consulta.');
  }
}

// ========================== BOOT ==========================
document.addEventListener('DOMContentLoaded', () => {
  carregarConsultasSupabase();

  // Recarrega quando voltar de outra aba (útil após criar/editar)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') carregarConsultasSupabase();
  });

  // Delegação de clique nos botões de ação dentro da tabela
  const consultasBody = document.getElementById('consultasBody');
  if (consultasBody) {
    consultasBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const tr = btn.closest('tr');
      const apptId = getApptIdFromTr(tr);
      if (!apptId) {
        console.warn('[consultas] clique sem ID detectado nessa linha; verifique se o render das linhas inclui data-id.');
        return;
      }
      const action = btn.dataset.action;
      if (action === 'edit') return onEditAppointment(apptId);
      if (action === 'delete') return onDeleteAppointment(apptId);
    });
  }
});
