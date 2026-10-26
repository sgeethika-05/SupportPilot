import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  RotateCw,
  FileText,
  Clock,
  ShieldAlert,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ticketsAPI, draftsAPI, auditAPI } from '../services/api';
import type {
  Ticket,
  Draft,
  AuditLog,
  TicketStatus,
  TicketUrgency,
} from '../types';
import Button from '../components/ui/Button';
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui/Card';
import {
  TicketStatusBadge,
  TicketUrgencyBadge,
  DraftStatusBadge,
} from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // AI Classification state
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<{
    category: string;
    urgency: string;
    confidence: number;
    escalate: boolean;
    reasoning: string;
  } | null>(null);

  // Draft generation state
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');

  // Reject Draft Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingDraftId, setRejectingDraftId] = useState<string | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Edit Ticket Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<TicketStatus>('open');
  const [editUrgency, setEditUrgency] =
    useState<TicketUrgency>('medium');
  const [editCategory, setEditCategory] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch ticket, drafts, and audit events
  const fetchTicketData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [
        ticketRes,
        draftsRes,
        ticketAuditRes,
        draftAuditRes,
      ] = await Promise.allSettled([
        ticketsAPI.get(id),
        draftsAPI.list(id),
        auditAPI.list({
          entity_type: 'ticket',
          page: 1,
          page_size: 50,
        }),
        auditAPI.list({
          entity_type: 'draft',
          page: 1,
          page_size: 50,
        }),
      ]);

      // Update ticket information
      if (ticketRes.status === 'fulfilled') {
        const t = ticketRes.value.data;

        setTicket(t);
        setEditTitle(t.title);
        setEditDesc(t.description);
        setEditStatus(t.status);
        setEditUrgency(t.urgency);
        setEditCategory(t.category || 'General');
      } else {
        setError(
          'Failed to retrieve ticket details. Ticket may not exist.'
        );
      }

      // Update drafts
      const ticketDrafts =
        draftsRes.status === 'fulfilled'
          ? draftsRes.value.data.items || []
          : [];

      setDrafts(ticketDrafts);

      // Collect ticket audit events
      const ticketLogs: AuditLog[] =
        ticketAuditRes.status === 'fulfilled'
          ? ticketAuditRes.value.data.items || []
          : [];

      // Collect draft audit events
      const draftLogs: AuditLog[] =
        draftAuditRes.status === 'fulfilled'
          ? draftAuditRes.value.data.items || []
          : [];

      // Get all draft IDs belonging to this ticket
      const ticketDraftIds = ticketDrafts.map((draft) => draft.id);

      // Include events belonging to the ticket or its drafts
      const relatedLogs = [...ticketLogs, ...draftLogs].filter(
        (log) =>
          log.entity_id === id ||
          (typeof log.entity_id === 'string' &&
            ticketDraftIds.includes(log.entity_id))
      );

      // Remove duplicate events, if any
      const uniqueLogs = Array.from(
        new Map(
          relatedLogs.map((log) => [log.id, log])
        ).values()
      );

      // Show the latest events first
      uniqueLogs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setAuditLogs(uniqueLogs);
    } catch (err) {
      console.error('Failed to load ticket information:', err);
      setError(
        'An error occurred while loading ticket information.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  // Run AI classification
  const handleClassifyAI = async () => {
    if (!id) return;

    setClassifying(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await ticketsAPI.classify(id);

      setClassificationResult(res.data);
      setActionSuccess(
        'AI Classification complete! Review suggested updates below.'
      );
    } catch (err) {
      console.error('AI classification failed:', err);
      setError(
        'AI classification service unavailable. Please try again.'
      );
    } finally {
      setClassifying(false);
    }
  };

  // Apply AI classification
  const handleApplyClassification = async () => {
    if (!id || !classificationResult) return;

    try {
      await ticketsAPI.update(id, {
        override_category: classificationResult.category,
        override_urgency:
          classificationResult.urgency as TicketUrgency,
        ai_confidence: classificationResult.confidence,
        ai_escalate: classificationResult.escalate,
      });

      setClassificationResult(null);
      setActionSuccess('Applied AI classification to ticket.');

      await fetchTicketData();
    } catch (err) {
      console.error('Failed to apply classification:', err);
      setError('Failed to update ticket classification.');
    }
  };

  // Generate an AI draft
  const handleGenerateDraft = async () => {
    if (!id) return;

    setGeneratingDraft(true);
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.create(
        id,
        draftPrompt.trim() || undefined
      );

      setDraftPrompt('');
      setActionSuccess(
        'AI Draft response created! Please review before sending.'
      );

      await fetchTicketData();
    } catch (err) {
      console.error('Draft generation failed:', err);
      setError(
        'Failed to generate draft. Please ensure Knowledge Base has relevant documents.'
      );
    } finally {
      setGeneratingDraft(false);
    }
  };
  
  // Approve a draft (approval only; no message is sent)
  const handleApproveDraft = async (draftId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.approve(draftId);

      setActionSuccess(
        'Draft approved successfully. No customer message was sent because delivery is not configured.'
      );

      await fetchTicketData();
    } catch (err) {
      console.error('Draft approval failed:', err);
      setError('Failed to approve draft.');
    }
  };


  // Open the rejection modal
  const handleOpenRejectModal = (draftId: string) => {
    setRejectingDraftId(draftId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Reject a draft
  const handleConfirmReject = async () => {
    if (!rejectingDraftId) return;

    setRejecting(true);
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.reject(
        rejectingDraftId,
        rejectReason.trim() || 'Declined by agent'
      );

      setRejectModalOpen(false);
      setRejectingDraftId(null);
      setActionSuccess('Draft marked as rejected.');

      // Refresh drafts and audit events after rejection
      await fetchTicketData();
    } catch (err) {
      console.error('Draft rejection failed:', err);
      setError('Failed to reject draft.');
    } finally {
      setRejecting(false);
    }
  };

  // Escalate a draft
  const handleEscalateDraft = async (draftId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.escalate(draftId);

      setActionSuccess(
        'Draft escalated to Senior Tier Support.'
      );

      await fetchTicketData();
    } catch (err) {
      console.error('Draft escalation failed:', err);
      setError('Failed to escalate draft.');
    }
  };

  // Regenerate a draft
  const handleRegenerateDraft = async (draftId: string) => {
    setError(null);
    setActionSuccess(null);

    try {
      await draftsAPI.regenerate(draftId);

      setActionSuccess(
        'Regenerating draft with updated context...'
      );

      await fetchTicketData();
    } catch (err) {
      console.error('Draft regeneration failed:', err);
      setError('Failed to regenerate draft.');
    }
  };

  // Update ticket information
  const handleUpdateTicket = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!id) return;

    setUpdating(true);
    setError(null);
    setActionSuccess(null);

    try {
      await ticketsAPI.update(id, {
        title: editTitle,
        description: editDesc,
        status: editStatus,
        urgency: editUrgency,
        category: editCategory,
      });

      setEditModalOpen(false);
      setActionSuccess('Ticket updated successfully.');

      await fetchTicketData();
    } catch (err) {
      console.error('Ticket update failed:', err);
      setError('Failed to update ticket details.');
    } finally {
      setUpdating(false);
    }
  };

  // Delete ticket
  const handleDeleteTicket = async () => {
    if (
      !id ||
      !window.confirm(
        'Are you sure you want to delete this ticket?'
      )
    ) {
      return;
    }

    try {
      await ticketsAPI.delete(id);
      navigate('/tickets');
    } catch (err) {
      console.error('Ticket deletion failed:', err);
      setError('Failed to delete ticket.');
    }
  };

  if (loading && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-500">
          Loading ticket #{id?.slice(0, 8)}...
        </p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          Ticket not found or has been removed.
        </Alert>

        <Button
          variant="outline"
          onClick={() => navigate('/tickets')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Back to tickets list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-400">
                #{ticket.id.slice(0, 8)}
              </span>

              <TicketUrgencyBadge
                urgency={
                  ticket.override_urgency || ticket.urgency
                }
              />

              <TicketStatusBadge status={ticket.status} />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {ticket.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClassifyAI}
            loading={classifying}
            icon={
              <Sparkles className="w-4 h-4 text-brand-600" />
            }
          >
            Classify with AI
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteTicket}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
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
        <Alert
          variant="error"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Human review warning */}
      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 flex items-start gap-3.5 shadow-sm">
        <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />

        <div className="text-sm">
          <p className="font-bold text-amber-900 tracking-wide uppercase text-xs">
            Human-in-the-Loop Protocol Enforced
          </p>

          <p className="text-amber-800 mt-0.5">
            <strong>DRAFT - NOT SENT:</strong> AI-generated responses
            are staged for support agent review. No message is
            transmitted to customers without explicit human
            authorization.
          </p>
        </div>
      </div>

      {/* AI Classification Recommendation */}
      {classificationResult && (
        <Card className="border-brand-300 bg-brand-50/30">
          <CardHeader className="bg-brand-50/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <CardTitle>AI Classification Suggestion</CardTitle>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800">
              {Math.round(
                classificationResult.confidence * 100
              )}
              % Confidence
            </span>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-500">
                  Predicted Category:
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {classificationResult.category}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500">
                  Predicted Urgency:
                </span>
                <p className="text-sm font-semibold text-slate-800 capitalize">
                  {classificationResult.urgency}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500">
                  Escalation Required:
                </span>

                <p
                  className={`text-sm font-semibold ${
                    classificationResult.escalate
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {classificationResult.escalate
                    ? 'Yes (Senior tier)'
                    : 'No'}
                </p>
              </div>
            </div>

            {classificationResult.reasoning && (
              <div className="text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-brand-100">
                <span className="font-semibold text-slate-700">
                  Reasoning:{' '}
                </span>
                {classificationResult.reasoning}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClassificationResult(null)}
              >
                Dismiss
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyClassification}
                icon={<Check className="w-4 h-4" />}
              >
                Apply Recommendation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Details and Drafts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Inquiry */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Inquiry</CardTitle>

              <span className="text-xs text-slate-400">
                Created{' '}
                {ticket.created_at
                  ? formatDistanceToNow(
                      new Date(ticket.created_at),
                      { addSuffix: true }
                    )
                  : 'recently'}
              </span>
            </CardHeader>

            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                {ticket.description}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">
                    Category
                  </span>

                  <span className="font-semibold text-slate-800">
                    {ticket.override_category ||
                      ticket.category ||
                      'General'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Current Status
                  </span>

                  <span className="font-semibold text-slate-800 capitalize">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Urgency
                  </span>

                  <span className="font-semibold text-slate-800 capitalize">
                    {ticket.override_urgency || ticket.urgency}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Ticket ID
                  </span>

                  <span className="font-mono text-slate-600 truncate block">
                    {ticket.id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Copilot Draft Generator */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                <CardTitle>AI Copilot Draft Generator</CardTitle>
              </div>

              <Link
                to={`/copilot?ticket_id=${ticket.id}`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Open in Copilot
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-xs text-slate-500">
                Generate an answer grounded in indexed documentation
                from the Knowledge Base. You can add special agent
                instructions or constraints below.
              </p>

              <Textarea
                rows={2}
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="Optional custom instructions for AI..."
              />

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateDraft}
                  loading={generatingDraft}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Generate AI Draft Response
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Draft Responses */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center justify-between">
              <span>
                Staged Draft Responses ({drafts.length})
              </span>
            </h3>

            {drafts.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 text-sm">
                No draft responses generated yet. Click &quot;Generate
                AI Draft Response&quot; above to start.
              </Card>
            ) : (
              drafts.map((draft, idx) => (
                <Card
                  key={draft.id}
                  className="border-slate-200"
                >
                  <CardHeader className="flex flex-row items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <DraftStatusBadge status={draft.status} />

                      <span className="text-xs text-slate-400">
                        Draft #{idx + 1} •{' '}
                        {formatDistanceToNow(
                          new Date(draft.created_at),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {draft.regeneration_count > 0 && (
                        <span className="text-[11px] text-slate-400">
                          {draft.regeneration_count} revisions
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleRegenerateDraft(draft.id)
                        }
                        className="text-xs text-slate-500 hover:text-brand-600 p-1 rounded hover:bg-slate-100 flex items-center gap-1"
                        title="Regenerate draft"
                        aria-label="Regenerate draft"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Draft Content */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {draft.content}
                    </div>

                    {/* Rejection Note */}
                    {draft.rejection_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                        <strong>Rejection Reason:</strong>{' '}
                        {draft.rejection_reason}
                      </div>
                    )}

                    {/* Retrieved Sources */}
                    {draft.sources && draft.sources.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                          Retrieved Knowledge Base Sources (
                          {draft.sources.length})
                        </span>

                        <div className="space-y-2">
                          {draft.sources.map((src, sIdx) => (
                            <div
                              key={src.id || sIdx}
                              className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-200/80"
                            >
                              <div className="flex items-center justify-between font-medium text-slate-800 mb-1">
                                <span className="flex items-center gap-1.5 text-brand-700">
                                  <FileText className="w-3.5 h-3.5" />
                                  {src.document_name ||
                                    `Doc Chunk #${src.id?.slice(0, 6)}`}
                                </span>

                                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                  Score:{' '}
                                  {Math.round((src.score || 0) * 100)}%
                                </span>
                              </div>

                              <p className="text-slate-600 line-clamp-2 italic">
                                &quot;{src.content}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agent Review Actions */}
                    {draft.status === 'draft' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() =>
                              handleApproveDraft(draft.id)
                            }
                            icon={<Check className="w-4 h-4" />}
                          >
                            Approve &amp; Send Response
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleOpenRejectModal(draft.id)
                            }
                            icon={<X className="w-4 h-4" />}
                          >
                            Reject Draft
                          </Button>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleEscalateDraft(draft.id)
                          }
                          icon={
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          }
                        >
                          Escalate to Senior Tier
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Audit Trail and Ticket Metadata */}
        <div className="space-y-6">
          {/* Ticket Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Ticket Metadata
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">
                  Assigned To:
                </span>

                <span className="font-semibold text-slate-800">
                  {ticket.assigned_to_id
                    ? 'Support Agent'
                    : 'Unassigned'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">
                  AI Confidence:
                </span>

                <span className="font-semibold text-slate-800">
                  {ticket.ai_confidence
                    ? `${Math.round(ticket.ai_confidence * 100)}%`
                    : 'Not classified'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Created:</span>

                <span className="text-slate-700">
                  {ticket.created_at
                    ? format(
                        new Date(ticket.created_at),
                        'MMM d, yyyy HH:mm'
                      )
                    : '—'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400">
                  Last Modified:
                </span>

                <span className="text-slate-700">
                  {ticket.updated_at
                    ? format(
                        new Date(ticket.updated_at),
                        'MMM d, yyyy HH:mm'
                      )
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <CardTitle className="text-sm">
                  Audit Trail
                </CardTitle>
              </div>

              <span className="text-[11px] text-slate-400">
                {auditLogs.length} events
              </span>
            </CardHeader>

            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No explicit audit logs recorded for this ticket yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs border-l-2 border-brand-500 pl-3 py-0.5"
                    >
                      <div className="font-semibold text-slate-800">
                        {log.action}
                      </div>

                      <p className="text-slate-400 text-[11px]">
                        {formatDistanceToNow(
                          new Date(log.created_at),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Draft Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject AI Draft"
        description="Provide a reason for rejecting this draft response. This feedback will improve future drafts."
      >
        <div className="space-y-4">
          <Textarea
            label="Rejection Feedback"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Inaccurate billing refund policy referenced, missing account ID check..."
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
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Ticket Details"
      >
        <form
          onSubmit={handleUpdateTicket}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <Textarea
            label="Description"
            rows={4}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>

              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as TicketStatus)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Urgency
              </label>

              <select
                value={editUrgency}
                onChange={(e) =>
                  setEditUrgency(
                    e.target.value as TicketUrgency
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>

            <Input
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              placeholder="Technical Support, Billing, Security..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
              loading={updating}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TicketDetail;