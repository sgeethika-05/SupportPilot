import React, { useState } from 'react';
import {
  FlaskConical,
  Search,
  Sliders,
  Download,
  Clock,
  FileText,
  Percent,
} from 'lucide-react';
import { ragAPI } from '../services/api';
import type { RAGResponse, RAGResult } from '../types';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Alert from '../components/ui/Alert';

export const RAGLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [minSimilarity, setMinSimilarity] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragData, setRagData] = useState<RAGResponse | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await ragAPI.search(query.trim(), topK, minSimilarity);
      setRagData(res.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError?.response?.data?.detail ||
          'Failed to execute RAG semantic search. Ensure vector embeddings are indexed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!ragData) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ragData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rag-search-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getScoreBadge = (score: number) => {
    let colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    let label = 'Low';

    if (score >= 0.85) {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Strong';
    } else if (score >= 0.7) {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Moderate';
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colorClasses}`}
      >
        <span>{(score * 100).toFixed(1)}%</span>
        <span className="text-[10px] uppercase font-semibold opacity-75">({label})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-brand-700 text-brand-200">
            <FlaskConical className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold">RAG Retrieval Laboratory</h2>
        </div>
        <p className="text-sm text-slate-300 max-w-2xl">
          Evaluate vector embeddings and similarity scores interactively. Fine-tune top-K and
          cosine distance cutoffs to optimize retrieval precision and avoid hallucinations.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Query & Parameter Controls */}
      <Card>
        <CardContent className="space-y-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Semantic Test Query
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. How does rate limiting work on the API v2 endpoints?"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {/* Top-K Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-600" />
                    Top-K Retrieved Chunks:
                  </span>
                  <span className="font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    {topK}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>1 (Precise)</span>
                  <span>20 (Broad)</span>
                </div>
              </div>

              {/* Minimum Similarity Threshold Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-brand-600" />
                    Min Similarity Threshold:
                  </span>
                  <span className="font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    {(minSimilarity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={minSimilarity}
                  onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>50% (Permissive)</span>
                  <span>99% (Strict)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={<Search className="w-4 h-4" />}
              >
                Execute Vector Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {ragData && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="font-semibold text-slate-900 text-sm">
                Matches Found: {ragData.total_found}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Latency: <strong className="text-slate-800">{ragData.search_time_ms} ms</strong>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON
            </Button>
          </div>

          {ragData.results.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 text-sm">
              No vector chunks matched query &quot;{ragData.query}&quot; above the {(minSimilarity * 100).toFixed(0)}%
              threshold. Try lowering the similarity threshold.
            </Card>
          ) : (
            <div className="space-y-3">
              {ragData.results.map((item: RAGResult, index: number) => (
                <Card
                  key={item.id || index}
                  className="p-5 hover:border-brand-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-brand-600" />
                        {item.document_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Chunk #{item.chunk_index}
                      </span>
                    </div>

                    <div>{getScoreBadge(item.similarity_score)}</div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-800 leading-relaxed font-sans">
                    {item.content}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">Chunk ID: {item.id}</span>
                    <span className="font-mono">Doc ID: {item.document_id}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RAGLab;
