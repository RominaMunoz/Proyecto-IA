// === BarberCut — capa de conexión a la API ===
// Cambia esta URL por la de tu backend desplegado en Render.
const API_URL = 'https://barbercut-api.onrender.com/api';

const SESSION_KEY = 'bc_session';
const TOKEN_KEY = 'bc_token';

const ALL_TIMES = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30'
];

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...(opts.headers||{}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_URL + path, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch {}

  if (!res.ok) {
    const err = new Error(body?.error || 'Error de red');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const BC = {
  ALL_TIMES,

  // ── Sesión ──────────────────────────────
  setSession(session, token) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  },
  getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },
  requireRole(role, redirectTo) {
    const s = this.getSession();
    if (!s || s.role !== role) { window.location.href = redirectTo; return null; }
    return s;
  },

  // ── Auth ──────────────────────────────
  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setSession({ role: data.user.role, id: data.user.id, name: data.user.name,
                       initials: data.user.initials, email: data.user.email }, data.token);
    return data.user;
  },

  // ── Servicios ──────────────────────────────
  getServices(all = false) {
    return apiFetch('/services' + (all ? '?all=1' : ''));
  },
  createService(svc) {
    return apiFetch('/services', { method: 'POST', body: JSON.stringify(svc) });
  },
  updateService(id, fields) {
    return apiFetch('/services/' + id, { method: 'PATCH', body: JSON.stringify(fields) });
  },
  deleteService(id) {
    return apiFetch('/services/' + id, { method: 'DELETE' });
  },
  importServicesCSV(rows) {
    return apiFetch('/services/import-csv', { method: 'POST', body: JSON.stringify({ rows }) });
  },
  // Parsea texto CSV crudo a array de objetos {sku,nombre_servicio,costo_unitario,precio_venta,unidades_vendidas}
  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] ?? '').trim());
      return obj;
    });
  },

  // ── Trabajadores ──────────────────────────────
  getWorkers(all = false) {
    return apiFetch('/users/workers' + (all ? '/all' : ''));
  },
  createWorker(w) {
    return apiFetch('/users/workers', { method: 'POST', body: JSON.stringify(w) });
  },
  updateWorker(id, fields) {
    return apiFetch('/users/workers/' + id, { method: 'PATCH', body: JSON.stringify(fields) });
  },
  deleteWorker(id) {
    return apiFetch('/users/workers/' + id, { method: 'DELETE' });
  },

  // ── Reservas ──────────────────────────────
  getBookings(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return apiFetch('/bookings' + (qs ? '?' + qs : ''));
  },
  getRecentPublic(limit = 6) {
    return apiFetch('/bookings/public/recent?limit=' + limit);
  },
  getAvailable(workerId, date) {
    return apiFetch(`/bookings/available?worker_id=${workerId}&date=${date}`);
  },
  createBooking(b) {
    return apiFetch('/bookings', { method: 'POST', body: JSON.stringify(b) });
  },
  updateBookingStatus(id, status) {
    return apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  rateBooking(id, rating) {
    return apiFetch(`/bookings/${id}/rating`, { method: 'PATCH', body: JSON.stringify({ rating }) });
  },
  deleteBooking(id) {
    return apiFetch('/bookings/' + id, { method: 'DELETE' });
  },

  // ── Helpers de formato (sin cambios) ──────────────────────────────
  fmt(n) {
    return '$' + (n||0).toLocaleString('es-CL');
  },
  fmtDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  },
  stars(rating) {
    if (!rating) return '<span style="color:var(--muted2)">Sin valorar</span>';
    return '<span style="color:var(--gold)">' + '★'.repeat(rating) + '☆'.repeat(5-rating) + '</span>';
  },
  statusBadge(status) {
    const map = {
      confirmada: '<span class="badge badge-info">Confirmada</span>',
      completada: '<span class="badge badge-success">Completada</span>',
      cancelada:  '<span class="badge badge-danger">Cancelada</span>',
    };
    return map[status] || status;
  },
  takenTimes(_data, workerId, date) {
    // Usado solo de forma síncrona en el HTML viejo; ver BC.getAvailable para la versión real (async).
    console.warn('BC.takenTimes está obsoleto, usa BC.getAvailable (async)');
    return [];
  },
};

window.BC = BC;
