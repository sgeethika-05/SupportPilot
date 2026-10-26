import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { detail?: string } };
      };

  setError(
    axiosError?.response?.data?.detail ||
      'Invalid email or password. Please try again.'
  );
} finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'admin' | 'agent') => {
    if (role === 'admin') {
      setEmail('admin@supportpilot.ai');
      setPassword('Admin123!');
    } else {
      setEmail('agent@supportpilot.ai');
      setPassword('Agent123!');
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
          SupportPilot
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          AI Support Desk Copilot with Verified Retrieval
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Copilot
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Quick Fill Demo Accounts:
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Admin Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('agent')}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Agent Demo
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by SupportPilot RBAC &amp; Prompt Security Shield
        </p>
      </div>
    </div>
  );
};

export default Login;
