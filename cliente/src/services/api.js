import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// GET /notes
export const getNotes = async () => {
  const { data } = await api.get('/notes');
  return Array.isArray(data) ? data : [];
};

// POST /notes (crear nueva nota)
export const createNote = async ({ noteId, title, content }) => {
  const response = await api.post('/notes', { noteId, title, content });
  return response.data;
};

// GET /notes/{noteId}
export const getNote = async (noteId) => {
  const { data } = await api.get(`/notes/${noteId}`);
  return data || null;
};

// PUT /notes/{noteId}
export const updateNote = async (noteId, { title, content }) => {
  const response = await api.put(`/notes/${noteId}`, { title, content });
  return response.data;
};

// DELETE /notes/{noteId}
export const deleteNote = async (noteId) => {
  await api.delete(`/notes/${noteId}`);
  return noteId;
};

// POST /notes/{noteId}/process
export const processNote = async (noteId) => {
  const { data } = await api.post(`/notes/${noteId}/process`);
  return data;
};

export default api;