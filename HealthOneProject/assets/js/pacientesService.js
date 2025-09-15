// /js/pacientesService.js
import { api } from './apiClient.js';

// se você tiver token, carregue aqui: const token = localStorage.getItem('token');

export async function listPacientes({ q, page=1, per_page=20 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', page);
  params.set('per_page', per_page);

  const payload = await api(`/pacientes${params.toString() ? `?${params}` : ''}`, {
    method: 'GET',
    // token
  });
  // payload: { success, data: [...], pagination: {...} }
  return { rows: payload?.data || [], pagination: payload?.pagination || null };
}

export async function getPaciente(id) {
  const payload = await api(`/pacientes/${encodeURIComponent(id)}`, {
    method: 'GET',
    // token
  });
  return payload?.data || null;
}

export async function createPaciente(data) {
  const payload = await api(`/pacientes`, {
    method: 'POST',
    data,
    // token
  });
  // retorna { success, message, data: { id, ... } }
  return payload?.data || null;
}

export async function updatePaciente(id, data) {
  const payload = await api(`/pacientes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data,
    // token
  });
  return payload?.data || null;
}

export async function deletePaciente(id) {
  await api(`/pacientes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    // token
  });
  return true;
}
