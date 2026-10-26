export type UserRole = 'agent' | 'admin';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'error';
export type DraftStatus = 'draft' | 'approved' | 'rejected' | 'escalated';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  urgency: TicketUrgency;
  category?: string;
  assigned_to_id?: string;
  created_by_id: string;
  ai_category?: string;
  ai_urgency?: string;
  ai_confidence?: number;
  ai_escalate?: boolean;
  override_category?: string;
  override_urgency?: string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message?: string;
  chunk_count: number;
  is_restricted: boolean;
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  similarity_score?: number;
  document_name?: string;
}

export interface Draft {
  id: string;
  ticket_id: string;
  content: string;
  status: DraftStatus;
  sources: Array<{ id: string; score: number; content: string; document_name: string }>;
  created_at: string;
  updated_at?: string;
  rejection_reason?: string;
  regeneration_count: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface Evaluation {
  id: string;
  name: string;
  query: string;
  expected_answer?: string;
  actual_answer?: string;
  retrieved_chunks: Chunk[];
  recall_at_k?: number;
  groundedness_score?: number;
  citation_precision?: number;
  latency_ms?: number;
  has_unsupported_claims: boolean;
  passed?: boolean;
  notes?: string;
  created_at: string;
}

export interface RAGResult {
  id: string;
  content: string;
  document_name: string;
  document_id: string;
  similarity_score: number;
  chunk_index: number;
}

export interface RAGResponse {
  query: string;
  results: RAGResult[];
  total_found: number;
  search_time_ms: number;
}

export interface CopilotResponse {
  answer: string;
  sources: RAGResult[];
  confidence: string;
  requires_escalation: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  pending_review: number;
  documents_indexed: number;
  total_chunks: number;
  drafts_pending: number;
  avg_resolution_time_hours: number;
}
