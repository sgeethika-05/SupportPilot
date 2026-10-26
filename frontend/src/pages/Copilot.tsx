import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  FileText,
  Copy,
  Check,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import { aiAPI, ticketsAPI } from '../services/api';
import type { CopilotResponse, Ticket } from '../types';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';

export const Copilot: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('ticket_id');

  const [question, setQuestion] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketIdParam || '');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch tickets for dropdown
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await ticketsAPI.list({ page_size: 30 });
        setTickets(res.data.items || []);
        if (ticketIdParam) {
          const match = (res.data.items || []).find((t) => t.id === ticketIdParam);
          if (match && !question) {
            setQuestion(match.description);
          }
        }
      } catch {
        // Silently continue
      }
    };
    fetchTickets();
  }, [ticketIdParam]);

  const handleTicketSelect = (id: string) => {
    setSelectedTicketId(id);
    const found = tickets.find((t) => t.id === id);
    if (found) {
      setQuestion(found.description);
    }
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await aiAPI.copilot(
        question.trim(),
        selectedTicketId ? selectedTicketId : undefined
      );
      setResult(res.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError?.response?.data?.detail ||
          'Failed to retrieve answer from AI Copilot. Please verify Knowledge Base documents are indexed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-brand-700/80 text-brand-200">
            <Sparkles className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold">SupportPilot AI Copilot</h2>
        </div>
        <p className="text-sm text-brand-100 max-w-2xl">
          Ask questions, troubleshoot issues, and generate grounded draft answers synthesized
          directly from your uploaded knowledge base documents.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Query Bar & Ticket Selector */}
      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Link to Existing Ticket (Optional)
            </label>
            <select
              value={selectedTicketId}
              onChange={(e) => handleTicketSelect(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">No linked ticket (General Copilot query)</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id.slice(0, 8)} - {t.title} ({t.urgency})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAskCopilot} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Support Question or Customer Inquiry
              </label>
              <textarea
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How does our refund policy handle enterprise cancellations within the 30-day trial period?"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Queries are embedded and matched against indexed vector chunks.
              </span>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={<Send className="w-4 h-4" />}
              >
                Synthesize Answer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Copilot Response Display */}
      {result && (
        <div className="space-y-6">
          {/* Disclaimer Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-900">
              <strong>Human Verification Required:</strong> AI-generated - requires human review
              before dispatching to customer. Ensure citations align with company policy.
            </p>
          </div>

          {/* Escalation Warning if low confidence or explicit escalate flag */}
          {result.requires_escalation && (
            <Alert variant="warning" title="Senior Support Escalation Recommended">
              The AI copilot detected low retrieval confidence or complex SLA criteria for this
              query. Consider routing this inquiry to a senior engineer or tier 2 agent.
            </Alert>
          )}

          {/* Main Answer Card */}
          <Card className="border-brand-200">
            <CardHeader className="bg-brand-50/40 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <CardTitle className="text-base">Synthesized Support Response</CardTitle>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    result.confidence === 'high'
                      ? 'success'
                      : result.confidence === 'medium'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  Confidence: {result.confidence.toUpperCase()}
                </Badge>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed font-sans bg-white p-4 rounded-xl border border-slate-100 shadow-inner">
                {result.answer}
              </div>
            </CardContent>
          </Card>

          {/* Retrieved Grounding Sources */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <CardTitle className="text-sm">
                  Retrieved Knowledge Base Sources ({result.sources.length})
                </CardTitle>
              </div>
              <span className="text-xs text-slate-400">Ranked by cosine similarity</span>
            </CardHeader>
            <CardContent>
              {result.sources.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No source documents met the similarity threshold.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.sources.map((src, index) => (
                    <div
                      key={src.id || index}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-brand-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-brand-700 truncate flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          {src.document_name}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {Math.round(src.similarity_score * 100)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        &quot;{src.content}&quot;
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400">
                        Chunk Index #{src.chunk_index} • ID: {src.id?.slice(0, 8)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Copilot;
