import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Trash2,
  RotateCw,
  Layers,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { documentsAPI } from '../services/api';
import type { Document as DocType, Chunk } from '../types';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { DocumentStatusBadge } from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

export const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Chunks Modal
  const [chunksModalOpen, setChunksModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentsAPI.list();
      setDocuments(res.data.items || []);
    } catch {
      setError('Failed to fetch knowledge base documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Polling every 3s if any document is processing or pending
  useEffect(() => {
    const hasActiveJobs = documents.some(
      (doc) => doc.status === 'processing' || doc.status === 'pending'
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // Dropzone Setup
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('File exceeds maximum size of 10MB.');
        return;
      }

      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        await documentsAPI.upload(formData);
        setSuccess(`"${file.name}" uploaded successfully. Ingestion and vector chunking started.`);
        fetchDocuments();
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError?.response?.data?.detail || 'Failed to upload document.');
      } finally {
        setUploading(false);
      }
    },
    [fetchDocuments]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleDeleteDoc = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the knowledge base?`)) {
      return;
    }
    try {
      await documentsAPI.delete(id);
      setSuccess(`Document "${name}" deleted.`);
      fetchDocuments();
    } catch {
      setError('Failed to delete document.');
    }
  };

  const handleReindexDoc = async (id: string) => {
    try {
      await documentsAPI.reindex(id);
      setSuccess('Reindexing initiated for document.');
      fetchDocuments();
    } catch {
      setError('Failed to reindex document.');
    }
  };

  const handleViewChunks = async (doc: DocType) => {
    setSelectedDoc(doc);
    setChunksModalOpen(true);
    setLoadingChunks(true);
    try {
      const res = await documentsAPI.chunks(doc.id);
      setChunks(res.data.items || []);
    } catch {
      setChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Knowledge Base &amp; Document Ingestion
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage documentation ingested into the vector store for AI Copilot retrieval
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          icon={<RotateCw className="w-3.5 h-3.5" />}
        >
          Refresh Status
        </Button>
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

      {/* Upload Zone */}
      <Card>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-brand-500 bg-brand-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shadow-sm">
                {uploading ? (
                  <LoadingSpinner size="md" color="text-brand-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {uploading
                    ? 'Uploading and processing document...'
                    : 'Click to upload or drag & drop files here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, Markdown (.md), Plain Text (.txt) • Maximum file size: 10MB
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                <span>Automatic chunking</span>
                <span>•</span>
                <span>Token counting</span>
                <span>•</span>
                <span>Semantic embeddings</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ingested Documents ({documents.length})</CardTitle>
          <span className="text-xs text-slate-400">
            Total Chunks:{' '}
            {documents.reduce((acc, curr) => acc + (curr.chunk_count || 0), 0)}
          </span>
        </CardHeader>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-500">Loading document catalog...</p>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Knowledge base is empty"
            description="Upload product documentation, FAQs, or troubleshooting guides above to ground AI responses."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-3">Document</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">File Size</th>
                  <th className="px-6 py-3">Chunks</th>
                  <th className="px-6 py-3">Uploaded</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 line-clamp-1">
                            {doc.original_name || doc.filename}
                          </p>
                          <span className="text-[11px] text-slate-400 uppercase font-mono">
                            {doc.file_type || 'TXT'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <DocumentStatusBadge status={doc.status} />
                      {doc.error_message && (
                        <p className="text-[11px] text-rose-600 mt-1">{doc.error_message}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {formatFileSize(doc.file_size)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {doc.chunk_count || 0} chunks
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {doc.created_at
                        ? formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })
                        : '—'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewChunks(doc)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View Vector Chunks"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReindexDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Re-index Document"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDoc(doc.id, doc.original_name || doc.filename)
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Chunks Modal */}
      <Modal
        isOpen={chunksModalOpen}
        onClose={() => setChunksModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            <span>Vector Chunks: {selectedDoc?.original_name || selectedDoc?.filename}</span>
          </div>
        }
        description={`Displaying indexed segments for retrieval. (${chunks.length} total)`}
        maxWidth="3xl"
      >
        {loadingChunks ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <p className="text-xs text-slate-500">Retrieving vector chunks...</p>
          </div>
        ) : chunks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No chunks generated for this document yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {chunks.map((chunk, idx) => (
              <div
                key={chunk.id || idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span className="font-semibold text-brand-700">Chunk #{chunk.chunk_index}</span>
                  <span>{chunk.token_count || 0} tokens</span>
                </div>
                <p className="text-slate-800 leading-relaxed font-sans">{chunk.content}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
