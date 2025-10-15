// src/services/api.js
import axios from 'axios';

const ORIGIN = (import.meta.env.VITE_API_BASE || 'https://yuanqfswhberkoevtmfr.supabase.co').replace(/\/+$/, '');
const REST_BASE = `${ORIGIN}/rest/v1`;
const AUTH_BASE = `${ORIGIN}/auth/v1`;

const APIKEY = import.meta.env.VITE_API_KEY || '';         // anon key
const SERVICE_KEY = import.meta.env.VITE_SERVICE_KEY || ''; // service_role (⚠️ nunca exponha em prod)

// REST
export const rest = axios.create({
  baseURL: REST_BASE,
  headers: {
    'Content-Type': 'application/json',
    apikey: APIKEY,
  },
});

// AUTH
export const auth = axios.create({
  baseURL: AUTH_BASE,
  headers: {
    'Content-Type': 'application/json',
    apikey: APIKEY,
  },
});

// injeta Authorization padrão (JWT do usuário logado)
const withAuthToken = (config) => {
  const token =
    localStorage.getItem('user_token') ||
    localStorage.getItem('auth.token') ||
    '';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

rest.interceptors.request.use(withAuthToken);
auth.interceptors.request.use(withAuthToken);

// headers de admin (usam service key)
export function getAdminHeaders() {
  if (!SERVICE_KEY) return {};
  return {
    apikey: APIKEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
}

// compat: default export apontando para REST (como você já usa)
const api = rest;
export default api;
api.interceptors.request.use((config) => {
  const userToken = localStorage.getItem('user_token'); // JWT do login
  const serviceKey = import.meta.env?.VITE_SERVICE_KEY; // DEV somente

  config.headers['apikey'] = import.meta.env?.VITE_API_KEY; // sua anon key
  config.headers['Content-Type'] = 'application/json';

  if (serviceKey) {
    // ⚠️ DEV APENAS — ignora RLS
    config.headers['Authorization'] = `Bearer ${serviceKey}`;
  } else if (userToken) {
    config.headers['Authorization'] = `Bearer ${userToken}`;
  }
  return config;
});