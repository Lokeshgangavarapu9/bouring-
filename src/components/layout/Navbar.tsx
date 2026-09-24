import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { 
  Users, 
  User as UserIcon, 
  Settings, 
  Boxes, 
  LogOut,
  Sparkles,
  Menu,
  X,
  Inbox
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { connections } = useNetwork();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // Count pending received requests
  const pendingCount = connections.filter(
    c => c.status === 'PENDING' && c.receiver_id === currentUser?.id
  ).length;

  const isDarkWorkspace = location.pathname === '/3d-lab' || location.pathname === '/molecule';

  const navItems = [
    { to: '/profile', label: 'Profile', icon: UserIcon, badge: null },
    { to: '/molecule', label: 'Molecule', icon: Sparkles, badge: null },
    { to: '/people', label: 'People', icon: Users, badge: null },
    { to: '/requests', label: 'Requests', icon: Inbox, badge: pendingCount > 0 ? pendingCount : null },
    { to: '/3d-lab', label: '3D Lab', icon: Boxes, badge: null },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b transition-colors ${
          isDarkWorkspace
            ? 'border-slate-800/80 bg-[#060810]/85 backdrop-blur-md'
            : 'border-slate-200/80 bg-[#FAF9F5]/90 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link
              to={currentUser ? '/profile' : '/'}
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className={`text-base font-semibold tracking-tight leading-none ${isDarkWorkspace ? 'text-white' : 'text-slate-900'}`}>
                Boring
              </span>
            </Link>

            {location.pathname === '/3d-lab' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 ml-2">
                <Boxes className="h-3 w-3" />
                <span>3D Workspace</span>
              </span>
            )}

            {location.pathname === '/molecule' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 ml-2">
                <Sparkles className="h-3 w-3" />
                <span>Molecule Studio</span>
              </span>
            )}
          </div>

          {/* Right Action / Menu controls */}
          <div className="flex items-center gap-3">
            {location.pathname !== '/' && currentUser ? (
              <div className="flex items-center gap-2">
                {/* User Avatar linking to profile */}
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 rounded-full border p-0.5 hover:ring-2 hover:ring-indigo-400 transition-all ${
                    isDarkWorkspace
                      ? 'border-slate-700/80 bg-slate-900/90'
                      : 'border-slate-200 bg-white/90'
                  }`}
                  title="Profile"
                >
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                </Link>

                {/* Clean Hamburger Menu Button */}
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                    menuOpen
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : isDarkWorkspace
                      ? 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 shadow-md'
                      : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white hover:border-slate-300 shadow-xs'
                  }`}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <a
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Login →</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Floating Menu Popover / Drawer */}
      {currentUser && menuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer / Floating Menu Panel */}
          <div className="fixed top-20 right-4 sm:right-6 w-72 rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-3 duration-150">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-2">
              <div className="flex items-center gap-2.5 truncate">
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                />
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                    @{currentUser.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Primary Product Navigation */}
            <div className="space-y-1 py-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== null && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-slate-100" />

            {/* Secondary Destinations */}
            <div className="space-y-1">
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  location.pathname === '/settings'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
