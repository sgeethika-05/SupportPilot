
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileText,
  UserCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { draftsAPI, ticketsAPI, usersAPI } from '../services/api';
import type { Draft, Ticket, User } from '../types';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { DraftStatusBadge } from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';

export const ReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [ticketsMap, setTicketsMap] = useState<Record<string, Ticket>>({});
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'draft' | 'escalated'
  >('all');
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [draftsRes, ticketsRes, usersRes] = await Promise.allSettled([
        draftsAPI.list(),
        ticketsAPI.list({ page_size: 100 }),
        usersAPI.list(),
      ]);

      if (draftsRes.status === 'fulfilled') {
        const allDrafts = draftsRes.value.data.items || [];

        // Keep drafts that are in 'draft' or 'escalated'
        const queueDrafts = allDrafts.filter(
          (d) => d.status === 'draft' || d.status === 'escalated'
        );

        setDrafts(queueDrafts);
      }

      if (ticketsRes.status === 'fulfilled') {
        const tMap: Record<string, Ticket> = {};

        (ticketsRes.value.data.items || []).forEach((t) => {
          tMap[t.id] = t;
        });

        setTicketsMap(tMap);
      }

      if (usersRes.status === 'fulfilled') {
        setAgents(usersRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
      setError('Failed to fetch review queue items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Approve a draft. This endpoint approves only; it does not send a message.
  const handleApprove = async (draftId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.approve(draftId);

      setActionSuccess(
        'Draft approved successfully. No customer message was sent because delivery is not configured.'
      );

      await fetchQueue();
    } catch (err) {
      console.error('Draft approval failed:', err);
      setError('Failed to approve draft.');
    }
  };

  const handleOpenReject = (draftId: string) => {
    setSelectedDraftId(draftId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedDraftId) return;

    setRejecting(true);
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.reject(
        selectedDraftId,
        rejectReason.trim() || 'Rejected by reviewer'
      );

      setRejectModalOpen(false);
      setSelectedDraftId(null);
      setActionSuccess('Draft successfully rejected.');

      await fetchQueue();
    } catch (err) {
      console.error('Draft rejection failed:', err);
      setError('Failed to reject draft.');
    } finally {
      setRejecting(false);
    }
  };

  const handleEscalate = async (draftId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.escalate(draftId);
      setActionSuccess('Draft escalated to Senior Tier review.');
      await fetchQueue();
    } catch (err) {
      console.error('Draft escalation failed:', err);
      setError('Failed to escalate draft.');
    }
  };

  const handleAssignAgent = async (ticketId: string, agentId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await ticketsAPI.update(ticketId, {
        assigned_to_id: agentId || undefined,
      });

      setActionSuccess('Assigned agent to ticket.');
      await fetchQueue();
    } catch (err) {
      console.error('Agent assignment failed:', err);
      setError('Failed to assign agent.');
    }
  };

  const filteredDrafts = drafts.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Human-in-the-Loop Review Queue
          </h2>

          <p className="text-sm text-slate-500 mt-0.5">
            Safeguard customer responses: inspect, revise, approve, or reject
            AI-generated drafts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === 'all'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({drafts.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('draft')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === 'draft'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({drafts.filter((d) => d.status === 'draft').length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('escalated')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === 'escalated'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Escalated (
              {drafts.filter((d) => d.status === 'escalated').length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <Alert
          variant="success"
          onClose={() => setActionSuccess(null)}
        >
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Drafts List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500">
            Checking pending review queue...
          </p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-6 h-6" />}
          title="Review queue is clear!"
          description="There are no pending AI drafts requiring human agent signoff right now. All clear!"
        />
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => {
            const ticket = ticketsMap[draft.ticket_id];

            return (
              <Card
                key={draft.id}
                className="border-slate-200 hover:border-brand-300 transition-all"
              >
                <CardHeader className="bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <DraftStatusBadge status={draft.status} />

                      <span className="text-xs text-slate-400">
                        Submitted{' '}
                        {draft.created_at
                          ? formatDistanceToNow(
                              new Date(draft.created_at),
                              { addSuffix: true }
                            )
                          : 'recently'}
                      </span>
                    </div>

                    <Link
                      to={`/tickets/${draft.ticket_id}`}
                      className="font-bold text-slate-900 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
                    >
                      <span>
                        {ticket?.title ||
                          `Ticket #${draft.ticket_id.slice(0, 8)}`}
                      </span>

                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>

                  {/* Assign to Agent Dropdown */}
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400" />

                    <select
                      value={ticket?.assigned_to_id || ''}
                      onChange={(e) =>
                        handleAssignAgent(draft.ticket_id, e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Unassigned</option>

                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Draft preview text */}
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-1.5">
                      Proposed AI Response Preview
                    </span>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {draft.content}
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-brand-700 font-medium">
                        <FileText className="w-3.5 h-3.5" />
                        {draft.sources ? draft.sources.length : 0} Knowledge
                        Sources
                      </span>

                      {ticket?.ai_confidence !== undefined &&
                        ticket.ai_confidence !== null && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Sparkles className="w-3 h-3 text-brand-600" />
                            Confidence:{' '}
                            {Math.round(ticket.ai_confidence * 100)}%
                          </span>
                        )}
                    </div>

                    <Link
                      to={`/tickets/${draft.ticket_id}`}
                      className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      Full Ticket &amp; Sources
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenReject(draft.id)}
                      icon={<X className="w-4 h-4" />}
                    >
                      Reject
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEscalate(draft.id)}
                      icon={
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      }
                    >
                      Escalate
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(draft.id)}
                      icon={<Check className="w-4 h-4" />}
                    >
                      Approve (No Message Sent)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject AI Draft"
        description="State why this draft is rejected so the team and model can adapt."
      >
        <div className="space-y-4">
          <Textarea
            label="Reason for Rejection"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Inaccurate product policy, incorrect tier pricing, tone inappropriate..."
            required
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={handleConfirmReject}
              loading={rejecting}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewQueue;
