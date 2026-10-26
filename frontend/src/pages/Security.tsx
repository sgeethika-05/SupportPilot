import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Lock,
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { auditAPI, usersAPI } from '../services/api';
import type { AuditLog, User } from '../types';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

export const Security: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters for Audit Log
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;

      const res = await auditAPI.list(params);
      setAuditLogs(res.data.items || []);
    } catch {
      setError('Failed to fetch audit log entries.');
    } finally {
      setLoadingAudit(false);
    }
  }, [actionFilter, entityFilter]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingUsers(true);
      const res = await usersAPI.list();
      setUsers(res.data || []);
    } catch {
      // Might return 403 if not admin
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAuditLogs();
    fetchUsers();
  }, [fetchAuditLogs, fetchUsers]);

  const handleRoleToggle = async (targetUser: User) => {
    const newRole = targetUser.role === 'admin' ? 'agent' : 'admin';
    try {
      await usersAPI.update(targetUser.id, { role: newRole });
      setSuccess(`Updated role for ${targetUser.name} to ${newRole}.`);
      fetchUsers();
    } catch {
      setError('Failed to update user role.');
    }
  };

  const handleStatusToggle = async (targetUser: User) => {
    try {
      await usersAPI.update(targetUser.id, { is_active: !targetUser.is_active });
      setSuccess(
        `${targetUser.name} has been ${targetUser.is_active ? 'deactivated' : 'activated'}.`
      );
      fetchUsers();
    } catch {
      setError('Failed to update user status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Security, Compliance &amp; Audit Logs
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Role-Based Access Control, prompt injection barriers, and immutable audit trail
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchAuditLogs();
            fetchUsers();
          }}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Refresh Data
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

      {/* 5 Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Authentication
            </h4>
          </div>
          <p className="text-sm font-bold text-slate-900">JWT Bearer (HS256)</p>
          <span className="text-[11px] text-emerald-600 font-medium">Active • 24hr expiry</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Access Control
            </h4>
          </div>
          <p className="text-sm font-bold text-slate-900">RBAC Enforced</p>
          <span className="text-[11px] text-brand-600 font-medium">Agent vs Administrator</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Validation
            </h4>
          </div>
          <p className="text-sm font-bold text-slate-900">Strict Schema</p>
          <span className="text-[11px] text-blue-600 font-medium">Pydantic sanitized inputs</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit Logging
            </h4>
          </div>
          <p className="text-sm font-bold text-slate-900">Tamper-Evident</p>
          <span className="text-[11px] text-indigo-600 font-medium">All mutations tracked</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prompt Defense
            </h4>
          </div>
          <p className="text-sm font-bold text-slate-900">Injection Guard</p>
          <span className="text-[11px] text-purple-600 font-medium">Jailbreak filter active</span>
        </Card>
      </div>

      {/* User Access Management (Admin Only) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-600" /> Team Access Control
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? 'Manage workspace credentials, grant administrative privileges, or suspend access.'
                : 'Workspace members. (Administrative privilege required to modify accounts).'}
            </p>
          </div>
          {isAdmin && (
            <Badge variant="brand" size="sm">
              Admin Mode Active
            </Badge>
          )}
        </CardHeader>

        {loadingUsers ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {isAdmin
              ? 'No registered users found.'
              : 'User directory view restricted to administrators.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Member Since</th>
                  {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'admin' ? 'brand' : 'secondary'}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {u.created_at
                        ? format(new Date(u.created_at), 'MMM d, yyyy')
                        : '—'}
                    </td>

                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleToggle(u)}
                            className="text-xs"
                          >
                            Switch to {u.role === 'admin' ? 'Agent' : 'Admin'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusToggle(u)}
                            className={u.is_active ? 'text-rose-600' : 'text-emerald-600'}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>System Mutation &amp; Security Audit Log</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Chronological log of agent and copilot actions
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">All Entity Types</option>
              <option value="ticket">Ticket</option>
              <option value="draft">Draft</option>
              <option value="document">Document</option>
              <option value="auth">Auth</option>
            </select>
          </div>
        </CardHeader>

        {loadingAudit ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <p className="text-xs text-slate-500">Loading audit events...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No audit entries found"
            description="All platform interactions such as draft approvals, ticket creations, and document uploads will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 text-xs">
                    <td className="px-6 py-3.5 text-slate-500 font-mono">
                      {log.created_at
                        ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')
                        : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase font-mono text-[10px]">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 6)})` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {log.user_id ? log.user_id.slice(0, 8) : 'system'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Security;
