import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { PanelLeft, Menu, Sparkles } from 'lucide-react';

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
}) => {
  const location = useLocation();
  const { currentUser } = useAuth();

  const is3DLab = location.pathname === '/3d-lab';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/profile')) return 'Profile';
    if (path === '/people') return 'People';
    if (path === '/requests') return 'Requests';
    if (path === '/molecule' || path === '/molecular-avatar') return 'Molecular Avatar';
    if (path === '/3d-lab') return '3D Lab';
    if (path === '/settings') return 'Settings';
    return 'Boring';
  };

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b backdrop-blur-md transition-colors ${
        is3DLab
          ? 'border-slate-800/80 bg-[#060810]/85 text-slate-100'
          : 'border-slate-200/80 bg-[#FAF9F5]/90 text-slate-800'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-3 sm:px-5">
        {/* Left: Sidebar Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border transition-all ${
              is3DLab
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'border-slate-200/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs'
            }`}
            title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            <span className="hidden md:inline">
              <PanelLeft className="h-4 w-4" />
            </span>
            <span className="md:hidden">
              <Menu className="h-4 w-4" />
            </span>
          </button>

          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Link
                to="/profile"
                className="hidden md:flex items-center gap-1.5 font-semibold text-xs text-indigo-500 hover:text-indigo-400 mr-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-bold">Boring</span>
                <span className="text-slate-400">/</span>
              </Link>
            )}
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right: Quick User Profile Pill */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className={`flex items-center gap-2 rounded-full border p-1 pr-3 hover:ring-2 hover:ring-indigo-400/40 transition-all ${
                is3DLab
                  ? 'border-slate-800 bg-slate-900/90 text-slate-200'
                  : 'border-slate-200/90 bg-white/90 text-slate-800 shadow-2xs'
              }`}
              title="Go to your profile"
            >
              <UserAvatar
                avatarUrl={currentUser.avatar_url}
                name={currentUser.name}
                size="sm"
              />
              <span className="text-xs font-semibold hidden sm:inline max-w-[120px] truncate">
                {currentUser.name}
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
