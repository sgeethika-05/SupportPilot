import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ticketsAPI } from '../services/api';
import type { Ticket, TicketStatus, TicketUrgency } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { TicketStatusBadge, TicketUrgencyBadge } from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';

export const Tickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // New Ticket Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrgency, setNewUrgency] = useState<TicketUrgency>('medium');
  const [newCategory, setNewCategory] = useState('Technical Support');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: {
        page: number;
        page_size: number;
        search?: string;
        status?: string;
        urgency?: string;
        category?: string;
      } = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (urgencyFilter !== 'all') params.urgency = urgencyFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await ticketsAPI.list(params);
      setTickets(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setError('Failed to fetch tickets. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, urgencyFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      setCreateError('Please complete all required fields.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await ticketsAPI.create({
        title: newTitle,
        description: newDesc,
        urgency: newUrgency,
        category: newCategory,
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchTickets();
      navigate(`/tickets/${res.data.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setCreateError(axiosError?.response?.data?.detail || 'Failed to create ticket.');
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Support Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            View, filter, and inspect AI-assisted support requests ({total} total)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Ticket
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Search and Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Urgency Filter */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Urgencies</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Categories</option>
              <option value="Technical Support">Technical</option>
              <option value="Billing">Billing</option>
              <option value="Account Management">Account</option>
              <option value="Security">Security</option>
              <option value="Feature Request">Feature Request</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tickets List */}
      <Card>
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-500">Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<TicketIcon className="w-6 h-6" />}
            title="No tickets found"
            description={
              search || statusFilter !== 'all' || urgencyFilter !== 'all'
                ? 'Try adjusting your search criteria or active filters.'
                : 'No support inquiries have been filed yet. Create your first ticket!'
            }
            action={{
              label: 'Create New Ticket',
              onClick: () => setIsModalOpen(true),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="p-5 hover:bg-slate-50/90 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 hover:text-brand-600 transition-colors">
                      {ticket.title}
                    </span>

                    {/* AI Escalation Tag if marked */}
                    {ticket.ai_escalate && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        AI Escalated
                      </span>
                    )}

                    {/* AI Confidence Tag */}
                    {ticket.ai_confidence !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-brand-600" />
                        {Math.round(ticket.ai_confidence * 100)}% match
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 max-w-3xl">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="font-medium text-slate-600">
                      {ticket.override_category || ticket.category || ticket.ai_category || 'General'}
                    </span>
                    <span>•</span>
                    <span>
                      Created{' '}
                      {ticket.created_at
                        ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })
                        : 'recently'}
                    </span>
                    {ticket.updated_at && (
                      <>
                        <span>•</span>
                        <span>
                          Updated{' '}
                          {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:flex-shrink-0 self-start sm:self-center">
                  <TicketUrgencyBadge urgency={ticket.override_urgency || ticket.urgency} />
                  <TicketStatusBadge status={ticket.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && tickets.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, total)} of {total} tickets
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-slate-700 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* New Ticket Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Ticket"
        description="Provide the customer inquiry details. SupportPilot AI will analyze and classify the request."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          {createError && <Alert variant="error">{createError}</Alert>}

          <Input
            label="Subject"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. SSO Login Failing with SAML 2.0 Identity Provider"
            required
          />

          <Textarea
            label="Problem Description"
            rows={4}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Include user details, error messages, and reproduction steps..."
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Technical Support">Technical Support</option>
                <option value="Billing">Billing</option>
                <option value="Account Management">Account Management</option>
                <option value="Security">Security</option>
                <option value="Feature Request">Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as TicketUrgency)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
