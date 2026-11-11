const BASE_URL = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.detail || `Ошибка запроса (${res.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  // Trees
  listTrees: () => request('/trees'),
  getTree: (treeId) => request(`/trees/${treeId}`),
  createTree: (payload) =>
    request('/trees', { method: 'POST', body: JSON.stringify(payload) }),
  updateTree: (treeId, payload) =>
    request(`/trees/${treeId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTree: (treeId) => request(`/trees/${treeId}`, { method: 'DELETE' }),
  createDemoTree: () => request('/trees/demo', { method: 'POST' }),
  exportTree: (treeId) => request(`/trees/${treeId}/export`),
  importTree: (payload) =>
    request('/trees/import', { method: 'POST', body: JSON.stringify(payload) }),

  // Persons
  createPerson: (treeId, payload) =>
    request(`/trees/${treeId}/persons`, { method: 'POST', body: JSON.stringify(payload) }),
  getPerson: (personId) => request(`/persons/${personId}`),
  updatePerson: (personId, payload) =>
    request(`/persons/${personId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePerson: (personId) => request(`/persons/${personId}`, { method: 'DELETE' }),
  addRelative: (personId, payload) =>
    request(`/persons/${personId}/relatives`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Unions
  createUnion: (payload) =>
    request('/unions', { method: 'POST', body: JSON.stringify(payload) }),
  updateUnion: (unionId, payload) =>
    request(`/unions/${unionId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUnion: (unionId) => request(`/unions/${unionId}`, { method: 'DELETE' }),
  addChildToUnion: (unionId, payload) =>
    request(`/unions/${unionId}/children`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeChildFromUnion: (unionId, childId) =>
    request(`/unions/${unionId}/children/${childId}`, { method: 'DELETE' }),
};
