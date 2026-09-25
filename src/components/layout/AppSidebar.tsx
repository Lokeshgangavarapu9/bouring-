import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { UserAvatar } from '../common/UserAvatar';
import {
  User as UserIcon,
  Users,
  Inbox,
  Sparkles,
  Boxes,
  Settings,
  LogOut,
  PanelLeftClose,
  X,
} from 'lucide-react';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onToggle,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { connections } = useNetwork();

  const isDarkTheme = location.pathname === '/3d-lab';

  const pendingCount = connections.filter(
    c => (c.status === 'PENDING' || c.status === 'REQUESTED') && c.receiver_id === currentUser?.id
  ).length;

  const navItems = [
    { to: '/profile', label: 'Profile', icon: UserIcon, badge: null },
    { to: '/people', label: 'People', icon: Users, badge: null },
    { to: '/requests', label: 'Requests', icon: Inbox, badge: pendingCount > 0 ? pendingCount : null },
    { to: '/molecule', label: 'Molecular Avatar', icon: Sparkles, badge: null },
    { to: '/3d-lab', label: '3D Lab', icon: Boxes, badge: null },
    { to: '/settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen flex flex-col border-r transition-all duration-300 ease-in-out shrink-0 select-none ${
          isDarkTheme
            ? 'border-slate-800/80 bg-[#060810]/95 text-slate-200'
            : 'border-slate-200/90 bg-[#FAF9F5]/95 text-slate-800'
        } ${
          isOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        <div className="w-64 h-full flex flex-col justify-between p-3.5">
          {/* Top: Brand & Collapse Toggle */}
          <div>
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-inherit px-2">
              <Link
                to="/profile"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 group focus:outline-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold tracking-tight leading-none ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                    Boring
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">Molecular Network</span>
                </div>
              </Link>

              {/* Desktop Collapse / Mobile Close Button */}
              <button
                type="button"
                onClick={onToggle}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isDarkTheme
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white'
                }`}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <span className="hidden md:inline">
                  <PanelLeftClose className="h-4 w-4" />
                </span>
                <span className="md:hidden">
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/molecule' && location.pathname === '/molecular-avatar') ||
                  (item.to === '/profile' && location.pathname.startsWith('/profile'));

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 text-white shadow-xs'
                        : isDarkTheme
                        ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== null && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom: Current Authenticated User & Log Out */}
          {currentUser && (
            <div className="pt-3 border-t border-inherit">
              <Link
                to="/profile"
                onClick={onCloseMobile}
                className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all mb-2 ${
                  isDarkTheme
                    ? 'border-slate-800/90 bg-slate-900/60 hover:bg-slate-800/80'
                    : 'border-slate-200/80 bg-white/70 hover:bg-white shadow-2xs'
                }`}
                title="View your profile"
              >
                <UserAvatar
                  avatarUrl={currentUser.avatar_url}
                  name={currentUser.name}
                  size="sm"
                  className="ring-1 ring-indigo-400/40 shrink-0"
                />
                <div className="truncate flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate leading-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate leading-none mt-0.5">
                    @{currentUser.username}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
