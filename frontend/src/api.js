const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    // Fastify rejeita Content-Type JSON sem corpo, então só enviamos quando há body
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Algo deu errado. Tente novamente.');
  return data;
}

export const api = {
  list: (search, signal) =>
    request(`/api/tasks?search=${encodeURIComponent(search)}&status=all`, { signal }),
  create: (title, dueDate) => request('/api/tasks', { method: 'POST', body: { title, dueDate } }),
  update: (id, changes) => request(`/api/tasks/${id}`, { method: 'PATCH', body: changes }),
  remove: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
};
