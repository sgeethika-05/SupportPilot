import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Real-time support operations & AI copilot metrics' },
  '/tickets': { title: 'Tickets', subtitle: 'Manage customer support requests and AI classifications' },
  '/copilot': { title: 'AI Copilot', subtitle: 'Generate grounded support responses with RAG' },
  '/knowledge-base': { title: 'Knowledge Base', subtitle: 'Upload and manage ingested documentation' },
  '/rag-lab': { title: 'RAG Lab', subtitle: 'Test vector similarity search and retrieval parameters' },
  '/review': { title: 'Review Queue', subtitle: 'Human-in-the-loop review for AI-generated drafts' },
  '/evaluation': { title: 'AI Evaluation', subtitle: 'Benchmarking groundedness, recall@k, and hallucination rates' },
  '/security': { title: 'Security & Audit', subtitle: 'Audit trails, role-based access control, and prompt defense' },
  '/settings': { title: 'Settings', subtitle: 'System preferences, retrieval limits, and team access' },
};

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const location = useLocation();

  const currentRoute =
    location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets'
      ? { title: 'Ticket Details', subtitle: 'Inspect ticket, AI draft responses, and audit history' }
      : pageTitles[location.pathname] || { title: 'SupportDesk Copilot' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {currentRoute.title}
          </h1>
          {currentRoute.subtitle && (
            <p className="hidden md:block text-xs text-slate-500">
              {currentRoute.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System online indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Connected</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand-700 font-semibold text-xs flex items-center justify-center">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SP'}
          </div>
          <span className="hidden sm:inline text-xs font-medium text-slate-700">
            {user?.name || 'Agent'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
