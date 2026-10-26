
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  HelpCircle,
  Award,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { evaluationsAPI } from '../services/api';
import type { Evaluation } from '../types';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';

export const AIEvaluation: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSuite, setRunningSuite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [evalName, setEvalName] = useState('');
  const [evalQuery, setEvalQuery] = useState('');
  const [evalExpected, setEvalExpected] = useState('');
  const [evalTopK, setEvalTopK] = useState(5);
  const [creating, setCreating] = useState(false);

  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await evaluationsAPI.list();
      const data = res.data;
      const items: Evaluation[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      if (Array.isArray(data) || Array.isArray(data?.items)) {
        // Keep only the newest record for each scenario and query.
        const uniqueMap = new Map<string, Evaluation>();

        for (const item of items) {
          const key = `${(item.name || '').trim().toLowerCase()}|${(item.query || '').trim().toLowerCase()}`;

          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }

        setEvaluations(Array.from(uniqueMap.values()));
      } else {
        setEvaluations([]);
        setError('The evaluation API returned an unexpected response format.');
      }
    } catch {
      setError('Failed to fetch AI evaluations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const handleRunSuite = async () => {
    setRunningSuite(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await evaluationsAPI.runSuite();

      setSuccess(
        `Full evaluation benchmark suite finished! Processed ${
          res.data.results?.length ?? 'all'
        } test cases.`
      );

      await fetchEvaluations();
    } catch {
      setError('Failed to complete full evaluation suite.');
    } finally {
      setRunningSuite(false);
    }
  };

  const handleCreateEval = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!evalName.trim() || !evalQuery.trim()) return;

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      await evaluationsAPI.create({
        name: evalName.trim(),
        query: evalQuery.trim(),
        expected_answer: evalExpected.trim() || undefined,
        top_k: evalTopK,
      });

      setModalOpen(false);
      setEvalName('');
      setEvalQuery('');
      setEvalExpected('');

      setSuccess('Evaluation benchmark scenario created and executed!');
      await fetchEvaluations();
    } catch {
      setError('Failed to create evaluation case.');
    } finally {
      setCreating(false);
    }
  };

  const totalCount = evaluations.length;

  const avgRecall = totalCount
    ? evaluations.reduce((acc, e) => acc + (e.recall_at_k ?? 0), 0) / totalCount
    : 0;

  const avgGroundedness = totalCount
    ? evaluations.reduce((acc, e) => acc + (e.groundedness_score ?? 0), 0) / totalCount
    : 0;

  const avgCitationPrecision = totalCount
    ? evaluations.reduce((acc, e) => acc + (e.citation_precision ?? 0), 0) / totalCount
    : 0;

  const unsupportedCount = evaluations.filter(
    (e) => e.has_unsupported_claims
  ).length;

  const unsupportedRate = totalCount
    ? (unsupportedCount / totalCount) * 100
    : 0;

  const passedCount = evaluations.filter((e) => e.passed).length;
  const failedCount = evaluations.filter((e) => e.passed === false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI Evaluation &amp; Groundedness Benchmarks
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Systematic metrics for hallucination detection, citation precision, and retrieval recall
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvaluations}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Scenario
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunSuite}
            loading={runningSuite}
            icon={<Play className="w-4 h-4" />}
          >
            Run Full Suite
          </Button>
        </div>
      </div>

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <strong>Evaluation Methodology:</strong> Recall@K and Citation Precision
          are calculated from retrieved content and explicit source markers.
          Groundedness and unsupported-claim scores are heuristic checks against
          retrieved knowledge-base text.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Avg Recall@K"
          value={`${(avgRecall * 100).toFixed(1)}%`}
          icon={<Zap className="w-5 h-5" />}
          iconBgColor="bg-brand-50"
          iconColor="text-brand-600"
          subtitle="Proportion of target chunks retrieved"
        />

        <StatCard
          label="Avg Groundedness"
          value={`${(avgGroundedness * 100).toFixed(1)}%`}
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="Answer overlap with knowledge-base text"
        />

        <StatCard
          label="Citation Precision"
          value={`${(avgCitationPrecision * 100).toFixed(1)}%`}
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Accuracy of explicit source references"
        />

        <StatCard
          label="Unsupported Rate"
          value={`${unsupportedRate.toFixed(1)}%`}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          subtitle={`${unsupportedCount} of ${totalCount} contain ungrounded claims`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Benchmark Scenarios &amp; Test Results ({evaluations.length})
          </CardTitle>
          <span className="text-xs text-slate-400">
            {passedCount} Passed / {failedCount} Failed
          </span>
        </CardHeader>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-500">Loading evaluation results...</p>
          </div>
        ) : evaluations.length === 0 ? (
          <EmptyState
            icon={<BarChart2 className="w-6 h-6" />}
            title="No evaluations executed yet"
            description="Run the benchmark suite to assess retrieval and answer quality."
            action={{
              label: 'Run Full Benchmark Suite',
              onClick: handleRunSuite,
              icon: <Play className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-3">Scenario</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Groundedness</th>
                  <th className="px-6 py-3">Recall@K</th>
                  <th className="px-6 py-3">Precision</th>
                  <th className="px-6 py-3">Hallucination</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {evaluations.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedEval(item)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {item.query}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {item.passed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                      {item.groundedness_score != null
                        ? `${(item.groundedness_score * 100).toFixed(0)}%`
                        : '—'}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {item.recall_at_k != null
                        ? `${(item.recall_at_k * 100).toFixed(0)}%`
                        : '—'}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {item.citation_precision != null
                        ? `${(item.citation_precision * 100).toFixed(0)}%`
                        : '—'}
                    </td>

                    <td className="px-6 py-4">
                      {item.has_unsupported_claims ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          Flagged
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          None detected
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEval(item);
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Benchmark Evaluation Scenario"
        description="Define a test query and optional expected reference answer."
      >
        <form onSubmit={handleCreateEval} className="space-y-4">
          <Input
            label="Scenario Name"
            value={evalName}
            onChange={(e) => setEvalName(e.target.value)}
            placeholder="e.g. Password reset test"
            required
          />

          <Textarea
            label="Query / Question"
            rows={3}
            value={evalQuery}
            onChange={(e) => setEvalQuery(e.target.value)}
            placeholder="Enter a question that your Knowledge Base can answer."
            required
          />

          <Textarea
            label="Expected Ground Truth Answer (Optional)"
            rows={3}
            value={evalExpected}
            onChange={(e) => setEvalExpected(e.target.value)}
            placeholder="Enter the expected answer, if available."
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Top-K Chunks to Retrieve
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={evalTopK}
              onChange={(e) =>
                setEvalTopK(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={creating}>
              Create &amp; Run Test
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedEval}
        onClose={() => setSelectedEval(null)}
        title={selectedEval?.name || 'Evaluation Detail'}
        maxWidth="3xl"
      >
        {selectedEval && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">
                Test Query:
              </span>
              <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-1">
                {selectedEval.query}
              </p>
            </div>

            {selectedEval.actual_answer && (
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  AI Generated Response:
                </span>
                <p className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200 mt-1 whitespace-pre-wrap">
                  {selectedEval.actual_answer}
                </p>
              </div>
            )}

            {selectedEval.expected_answer && (
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Expected Reference Answer:
                </span>
                <p className="text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 mt-1">
                  {selectedEval.expected_answer}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Groundedness</span>
                <span className="font-bold text-slate-800">
                  {selectedEval.groundedness_score != null
                    ? `${(selectedEval.groundedness_score * 100).toFixed(0)}%`
                    : '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Recall@K</span>
                <span className="font-bold text-slate-800">
                  {selectedEval.recall_at_k != null
                    ? `${(selectedEval.recall_at_k * 100).toFixed(0)}%`
                    : '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Citation Precision</span>
                <span className="font-bold text-slate-800">
                  {selectedEval.citation_precision != null
                    ? `${(selectedEval.citation_precision * 100).toFixed(0)}%`
                    : '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Latency</span>
                <span className="font-bold text-slate-800">
                  {selectedEval.latency_ms ?? '—'} ms
                </span>
              </div>
            </div>

            {selectedEval.notes && (
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
                  Evaluation Notes:
                </span>
                <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {selectedEval.notes}
                </p>
              </div>
            )}

            {selectedEval.retrieved_chunks &&
              selectedEval.retrieved_chunks.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
                    Retrieved Evaluation Chunks ({selectedEval.retrieved_chunks.length}):
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedEval.retrieved_chunks.map((chk, i) => (
                      <div
                        key={chk.id || i}
                        className="p-2.5 rounded bg-slate-100 text-xs text-slate-700"
                      >
                        <span className="font-bold text-brand-700 mr-2">
                          #{i + 1}
                        </span>
                        {chk.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEval(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIEvaluation;
