import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'agent' | 'admin'>('agent');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password, role });
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError?.response?.data?.detail ||
          'Failed to register account. An account with this email may already exist.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-xl shadow-brand-500/30">
            <Bot className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Create an Account
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          Join SupportPilot as a Support Agent or Administrator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Connor"
              required
              autoComplete="name"
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@supportpilot.ai"
              required
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role Selection <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'agent'
                      ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Agent</span>
                    {role === 'agent' && <ShieldCheck className="w-4 h-4 text-brand-600" />}
                  </div>
                  <p className="text-xs text-slate-500">Triage, review AI drafts, answer tickets</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'admin'
                      ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Admin</span>
                    {role === 'admin' && <ShieldCheck className="w-4 h-4 text-brand-600" />}
                  </div>
                  <p className="text-xs text-slate-500">Full system access, evaluations, audit logs</p>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
