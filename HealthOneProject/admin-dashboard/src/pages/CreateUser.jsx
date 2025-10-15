import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaUserMd, FaUserTie, FaUserShield, FaUser, FaSave, FaTimes } from 'react-icons/fa';
import api, { auth, rest, getAdminHeaders } from '../services/api';
import './CreateUser.css';

const ROLES = [
  { key: 'medico',      label: 'Novo Médico',     icon: <FaUserMd /> },
  { key: 'secretaria',  label: 'Nova Secretária', icon: <FaUserTie /> },
  { key: 'paciente',    label: 'Novo Paciente',   icon: <FaUser /> },
  { key: 'admin',       label: 'Novo Admin',      icon: <FaUserShield /> },
];

export default function CreateUser() {
  const navigate = useNavigate();
  const [role, setRole] = useState('medico');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const roleLabel = useMemo(() => ROLES.find(r => r.key === role)?.label || '', [role]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

async function handleSubmit(e) {
  e.preventDefault();
  setErr(''); setOk('');

  if (!form.email || !form.password || !form.full_name) {
    setErr('Preencha pelo menos e-mail, senha e nome completo.');
    return;
  }

  setLoading(true);
  try {
const adminHeaders = getAdminHeaders();
let userId = null;
let authRespPayload = null;

if (adminHeaders.Authorization) {
  // --- Caminho ADMIN (recomendado) ---
  const resp = await auth.post(
    '/admin/users',
    {
      email: form.email,
      password: form.password,
      user_metadata: {
        full_name: form.full_name,
        phone: form.phone,
        role,
      },
      email_confirm: true,
    },
    { headers: adminHeaders }
  );
  authRespPayload = resp?.data;
  userId = authRespPayload?.user?.id || authRespPayload?.id || null;
} else {
  // --- Fallback sem service key: /signup pode não devolver sessão/id útil imediatamente
  const resp = await auth.post('/signup', {
    email: form.email,
    password: form.password,
    options: {
      data: { full_name: form.full_name, phone: form.phone, role },
    },
  });
  authRespPayload = resp?.data;
  userId = authRespPayload?.user?.id || null;

  // Se não veio id (comum quando exige confirmação por e-mail), resolve via profiles por e-mail
  if (!userId) {
    try {
      const find = await rest.get(
        `/profiles?select=id,email&amp;email=eq.${encodeURIComponent(form.email)}&amp;limit=1`
      );
      const rows = Array.isArray(find?.data) ? find.data : [];
      if (rows[0]?.id) userId = rows[0].id;
    } catch (eFind) {
      console.warn('[CreateUser] Não foi possível resolver userId via profiles por e-mail', eFind);
    }
  }
}

console.log('[CreateUser] payload de criação (resumo):', {
  hasAdminAuth: Boolean(adminHeaders.Authorization),
  userId,
  email: form.email,
});

if (!userId) {
  setErr('Não foi possível obter o ID do usuário recém-criado. Se o projeto exige confirmação de e-mail, confirme a conta e tente novamente, ou peça ao backend um endpoint que retorne o ID.');
  throw new Error('Sem userId após criação no Auth');
}

// Após obter userId...
let profileSaved = false;
// se por algum motivo o id ainda estiver vazio, caia no filtro por e-mail
const profileFilter = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(form.email)}`;

try {
  // 1) Atualiza por id OU por e-mail (conforme profileFilter)
  await rest.patch(`/profiles?${profileFilter}`,
    { full_name: form.full_name, phone: form.phone },
    {
      headers: {
        Prefer: 'return=minimal',
        ...getAdminHeaders(),
      },
    }
  );
  profileSaved = true;
  console.log('✅ Perfil atualizado com sucesso!');
} catch (err) {
  const status = err?.response?.status;
  console.warn('[CreateUser] PATCH profiles falhou', status);

  if (status === 404) {
    // 2) Se não existe registro, tenta criar (upsert) por e-mail
    try {
      await rest.post('/profiles',
        {
          // Não enviar id aqui: deixa o banco/trigger relacionar
          email: form.email,
          full_name: form.full_name,
          phone: form.phone,
          created_at: new Date().toISOString(),
        },
        {
          headers: {
            Prefer: 'resolution=merge-duplicates',
            ...getAdminHeaders(),
          },
        }
      );
      profileSaved = true;
      console.log('✅ Perfil criado via upsert');
    } catch (err2) {
      console.error('[CreateUser] POST profiles falhou', err2);
      setErr('Erro ao criar o perfil (sem permissão ou conflito).');
    }
  } else if (status === 403) {
    setErr('Sem permissão para salvar nome/telefone (RLS). Peça liberação ou use service key em DEV.');
  } else {
    setErr(`Erro ${status || ''}: não foi possível salvar o perfil (PATCH/POST profiles).`);
  }
}

if (profileSaved) {
  setOk(`${role === 'medico' ? 'Médico'
        : role === 'secretaria' ? 'Secretária'
        : role === 'admin' ? 'Admin' : 'Paciente'} criado(a) e perfil salvo com sucesso!`);
} else {
  setOk(`${role === 'medico' ? 'Médico'
        : role === 'secretaria' ? 'Secretária'
        : role === 'admin' ? 'Admin' : 'Paciente'} criado(a)! Porém não foi possível salvar nome/telefone (políticas RLS).`);
}
setForm({ email: '', password: '', full_name: '', phone: '' });

  } catch (e) {
    const status = e?.response?.status;
    const raw = e?.response?.data || {};
    const msg = raw?.message || raw?.error_description || e?.message || 'Erro ao criar usuário';

    // Tratamento específico p/ 422 do /signup
    let friendly = msg;
    if (status === 422) {
      // Alguns textos comuns do GoTrue:
      if (/signups? not allowed/i.test(msg)) {
        friendly = 'Cadastros por e-mail estão desabilitados no projeto (Auth → Providers → Email → Enable email signup).';
      } else if (/user already registered/i.test(msg)) {
        friendly = 'Este e-mail já está cadastrado.';
      } else if (/password/i.test(msg) && /weak|short|min/i.test(msg)) {
        friendly = 'Senha não atende a política. Tente uma senha mais forte/longa.';
      } else {
        friendly = `422 do Auth: ${msg}`;
      }
    }

    console.error('[CreateUser] erro', { status, data: raw });
    setErr(status ? `Erro ${status}: ${friendly}` : friendly);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="create-page">
      <header className="create-header">
        <div>
          <h1>Criar usuário</h1>
          <p>Selecione o tipo e preencha os dados básicos.</p>
        </div>
        <div className="actions">
          <Link to="/users" className="btn ghost"><FaTimes /> <span>Cancelar</span></Link>
        </div>
      </header>

      <div className="create-card card">
        {/* Tabs de papel */}
        <div className="role-tabs">
          {ROLES.map(r => (
            <button
              key={r.key}
              className={`role-tab ${role === r.key ? 'active' : ''}`}
              onClick={() => setRole(r.key)}
              type="button"
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Formulário */}
        <form className="form" onSubmit={handleSubmit}>
          <div className="grid">
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder={`ex. ${role === 'medico' ? 'dr.maria@mediconnect.com' :
                                  role === 'secretaria' ? 'secretaria@mediconnect.com' :
                                  role === 'admin' ? 'admin@mediconnect.com' :
                                  'paciente@mediconnect.com'}`}
                required
              />
            </div>

            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="ex. senha123!"
                required
              />
            </div>

            <div className="field">
              <label>Nome completo</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={onChange}
                placeholder={role === 'medico' ? 'Dra. Maria Santos' :
                             role === 'secretaria' ? 'Ana Costa' :
                             role === 'admin' ? 'João Silva' : 'José da Silva'}
                required
              />
            </div>

            <div className="field">
              <label>Telefone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={onChange}
                placeholder="ex. (11) 98888-8888"
              />
            </div>
          </div>

          <div className="form-footer">
            <span className="muted">Papel selecionado: <b>{role}</b></span>
            <button className="btn primary" type="submit" disabled={loading}>
              <FaSave /> <span>{loading ? 'Salvando...' : 'Criar usuário'}</span>
            </button>
          </div>

          {err && <div className="alert error">{err}</div>}
          {ok && <div className="alert ok">{ok}</div>}
        </form>
      </div>
    </div>
  );
}