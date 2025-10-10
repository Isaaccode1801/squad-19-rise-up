// /js/apiClient.js
export const BASE_URL = 'https://mock.apidog.com/m1/1053378-0-default/rest/v1/patients';

export async function api(path, { method='GET', data, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`; // use se ativar auth no Apidog

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await res.text();
  let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

  if (!res.ok) {
    const msg = (payload && (payload.message || payload.error)) || res.statusText;
    throw new Error(`API ${method} ${path} falhou: ${msg}`);
  }
  return payload; // atenção: endpoints retornam { success, data, ... }
}
