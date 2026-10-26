import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Sparkles,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  BarChart2,
  Shield,
  Settings,
  LogOut,
  Bot,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { draftsAPI } from '../../services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await draftsAPI.list();
        if (mounted && res.data) {
          const drafts = res.data.items || [];
          const pending = drafts.filter(
            (d) => d.status === 'draft' || d.status === 'escalated'
          ).length;
          setPendingDraftsCount(pending);
        }
      } catch {
        // Silently fail if not authenticated or offline
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Tickets', to: '/tickets', icon: Ticket },
    { name: 'AI Copilot', to: '/copilot', icon: Sparkles },
    { name: 'Knowledge Base', to: '/knowledge-base', icon: BookOpen },
    { name: 'RAG Lab', to: '/rag-lab', icon: FlaskConical },
    {
      name: 'Review Queue',
      to: '/review',
      icon: ClipboardCheck,
      badge: pendingDraftsCount > 0 ? pendingDraftsCount : undefined,
    },
    { name: 'AI Evaluation', to: '/evaluation', icon: BarChart2 },
    { name: 'Security', to: '/security', icon: Shield },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-900/50">
          <NavLink to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                SupportPilot
                <span className="text-[10px] font-semibold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Desk Copilot</p>
            </div>
          </NavLink>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-brand-500/30 text-brand-200 border border-brand-500/40 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-brand-700/80 border border-brand-500/30 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Agent'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role || 'agent'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
