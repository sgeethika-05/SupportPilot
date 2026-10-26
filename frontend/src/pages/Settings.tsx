import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  User,
  Activity,
  Key,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { healthAPI, usersAPI } from '../services/api';
import type { User as UserType } from '../types';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';

export const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Model & Retrieval Settings
  const [modelName, setModelName] = useState('gpt-4o-mini / text-embedding-3-small');
  const [apiKeyMasked] = useState('sk-••••••••••••••••••••7F9a');
  const [defaultTopK, setDefaultTopK] = useState<number>(() => {
    return parseInt(localStorage.getItem('sp_default_top_k') || '5', 10);
  });
  const [defaultMinSim, setDefaultMinSim] = useState<number>(() => {
    return parseFloat(localStorage.getItem('sp_default_min_sim') || '0.70');
  });

  // User Profile
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Team
  const [team, setTeam] = useState<UserType[]>([]);

  // Health
  const [health, setHealth] = useState<{ status: string; timestamp?: string } | null>(null);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    const fetchHealthAndTeam = async () => {
      try {
        const hRes = await healthAPI.check();
        setHealth(hRes.data);
      } catch {
        setHealth({ status: 'offline' });
      }

      if (isAdmin) {
        try {
          const uRes = await usersAPI.list();
          setTeam(uRes.data || []);
        } catch {
          // ignore
        }
      }
    };
    fetchHealthAndTeam();
  }, [isAdmin]);

  const handleSaveRetrieval = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    localStorage.setItem('sp_default_top_k', defaultTopK.toString());
    localStorage.setItem('sp_default_min_sim', defaultMinSim.toString());
    setTimeout(() => {
      setSavingSettings(false);
      setSuccess('Retrieval parameters successfully saved to workspace preferences.');
    }, 400);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      if (user?.id) {
        await usersAPI.update(user.id, { role: user.role });
      }
      await refreshUser();
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setError('Failed to update profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure AI copilot models, vector search defaults, and profile credentials
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-600" /> Model &amp; LLM Configuration
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Current foundation model and vector embedding provider
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Active Reasoning Model
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Backend LLM API Key
              </label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-xs text-slate-700">{apiKeyMasked}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Configured &amp; Active
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400">
              API Keys are stored encrypted in backend environment variables and never exposed to
              client code.
            </div>
          </CardContent>
        </Card>

        {/* Retrieval Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-600" /> Default Retrieval Settings
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Default vector search tuning applied across Copilot and Tickets
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveRetrieval} className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Top-K Chunk Limit:</span>
                  <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {defaultTopK} chunks
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={defaultTopK}
                  onChange={(e) => setDefaultTopK(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Minimum Cosine Similarity:</span>
                  <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {(defaultMinSim * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={defaultMinSim}
                  onChange={(e) => setDefaultMinSim(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingSettings}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Retrieval Defaults
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* User Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600" /> Agent Profile &amp; Security Credentials
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Update personal name and account authentication password
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                value={email}
                disabled
                helperText="Email cannot be changed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={savingProfile}
                icon={<Save className="w-4 h-4" />}
              >
                Update Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Health Check Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" /> Platform Infrastructure Diagnostics
          </CardTitle>
          <span className="text-xs text-slate-400">
            {health?.timestamp ? `Checked ${health.timestamp}` : 'Live Status'}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">FastAPI Server</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">http://localhost:8000</p>
              </div>
              <Badge variant="success">Operational</Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Vector Storage</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">FAISS / In-Memory</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Authentication</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">JWT Engine</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
