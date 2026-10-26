import axios, { AxiosInstance } from 'axios';
import type {
  User,
  Ticket,
  Document,
  Draft,
  AuditLog,
  Evaluation,
  RAGResponse,
  CopilotResponse,
  DashboardStats,
  PaginatedResponse,
  Chunk,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sp_token');
      // Only redirect if not already on login or register page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post<{ access_token: string; token_type: string }>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
};

export const ticketsAPI = {
  list: (params?: {
    status?: string;
    urgency?: string;
    search?: string;
    category?: string;
    page?: number;
    page_size?: number;
  }) => api.get<PaginatedResponse<Ticket>>('/tickets', { params }),
  get: (id: string) => api.get<Ticket>(`/tickets/${id}`),
  create: (data: { title: string; description: string; urgency?: string; category?: string }) =>
    api.post<Ticket>('/tickets', data),
  update: (id: string, data: Partial<Ticket>) => api.patch<Ticket>(`/tickets/${id}`, data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
  classify: (id: string) =>
    api.post<{
      category: string;
      urgency: string;
      confidence: number;
      escalate: boolean;
      reasoning: string;
    }>(`/tickets/${id}/classify`),
};

export const documentsAPI = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Document>>('/documents', { params }),
  upload: (formData: FormData) =>
    api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (id: string) => api.get<Document>(`/documents/${id}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
  reindex: (id: string) => api.post<Document>(`/documents/${id}/reindex`),
  chunks: (id: string) => api.get<{ items: Chunk[]; total: number }>(`/documents/${id}/chunks`),
};

export const ragAPI = {
  search: (query: string, topK = 5, minSimilarity = 0.7) =>
    api.post<RAGResponse>('/rag/search', {
      query,
      top_k: topK,
      min_similarity: minSimilarity,
    }),
  stats: () =>
    api.get<{
      total_documents: number;
      total_chunks: number;
      indexed_documents: number;
    }>('/rag/stats'),
};

export const aiAPI = {
  copilot: (question: string, ticketId?: string) =>
    api.post<CopilotResponse>('/ai/copilot', {
      question,
      ticket_id: ticketId,
    }),
  classify: (title: string, description: string) =>
    api.post<{
      category: string;
      urgency: string;
      confidence: number;
      escalate: boolean;
      reasoning: string;
    }>('/ai/classify', { title, description }),
};

export const draftsAPI = {
  list: (ticketId?: string) =>
    api.get<PaginatedResponse<Draft>>('/drafts', { params: { ticket_id: ticketId } }),
  create: (ticketId: string, query?: string) =>
    api.post<Draft>('/drafts', { ticket_id: ticketId, query }),
  get: (id: string) => api.get<Draft>(`/drafts/${id}`),
  update: (
    id: string,
    data: { content?: string; status?: string; rejection_reason?: string }
  ) => api.patch<Draft>(`/drafts/${id}`, data),
  approve: (id: string) => api.post<Draft>(`/drafts/${id}/approve`),
  reject: (id: string, reason: string) => api.post<Draft>(`/drafts/${id}/reject`, { reason }),
  escalate: (id: string) => api.post<Draft>(`/drafts/${id}/escalate`),
  regenerate: (id: string) => api.post<Draft>(`/drafts/${id}/regenerate`),
};

export const auditAPI = {
  list: (params?: { page?: number; page_size?: number; action?: string; entity_type?: string }) =>
    api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
};

export const evaluationsAPI = {
  list: () => api.get<PaginatedResponse<Evaluation>>('/evaluations'),
  create: (data: { name: string; query: string; expected_answer?: string; top_k?: number }) =>
    api.post<Evaluation>('/evaluations', data),
  get: (id: string) => api.get<Evaluation>(`/evaluations/${id}`),
  runSuite: () =>
    api.post<{ results: Evaluation[]; summary: Record<string, number> }>('/evaluations/run-suite'),
};

export const healthAPI = {
  check: () => api.get<{ status: string; timestamp: string; services?: Record<string, string> }>('/health'),
};

export const usersAPI = {
  list: () => api.get<User[]>('/users'),
  update: (id: string, data: { role?: string; is_active?: boolean }) =>
    api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const dashboardAPI = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
};

export default api;
