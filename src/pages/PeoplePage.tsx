import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { User } from '../types';
import { api } from '../services/api';
import { 
  Search, 
  UserPlus, 
  Check, 
  Clock, 
  Boxes, 
  Network, 
  X, 
  Globe, 
  Github, 
  Linkedin, 
  ExternalLink,
  Sparkles,
  Lock,
  Users as UsersIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PeoplePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    users,
    getConnectionBetween,
    sendConnectionRequest,
    acceptConnection,
    connectBack,
    isUserMutual,
    canConnectBack,
    getAcceptedConnections,
  } = useNetwork();

  const [query, setQuery] = useState('');
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [authorizedProfile, setAuthorizedProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const filteredUsers = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    const matchName = u.name.toLowerCase().includes(query.toLowerCase());
    const matchUsername = u.username.toLowerCase().includes(query.toLowerCase());
    const matchBio = u.bio.toLowerCase().includes(query.toLowerCase());
    return matchName || matchUsername || matchBio;
  });

  // Fetch server-side authorized profile when preview modal opens
  useEffect(() => {
    if (!previewUser) {
      setAuthorizedProfile(null);
      return;
    }
    let isMounted = true;
    setLoadingProfile(true);

    api.profile.getSocialProfile(previewUser.id)
      .then(res => {
        if (isMounted) {
          setAuthorizedProfile(res);
          setLoadingProfile(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingProfile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [previewUser]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'github': return <Github className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900">
            Discover <span className="font-semibold">People</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Find peers, preview profiles, initiate mutual connections, and watch bonds form in 3D.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, role, interest..."
            className="w-full rounded-full border border-slate-200 bg-white/80 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
          />
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => {
          const conn = currentUser ? getConnectionBetween(currentUser.id, user.id) : undefined;
          const isMutual = isUserMutual(user.id);
          const needsConnectBack = canConnectBack(user.id);
          const isPendingSent = (conn?.status === 'PENDING' || conn?.status === 'REQUESTED') && conn.requester_id === currentUser?.id;
          const isPendingReceived = (conn?.status === 'PENDING' || conn?.status === 'REQUESTED') && conn.receiver_id === currentUser?.id;
          const mutualBonds = getAcceptedConnections(user.id);

          return (
            <div
              key={user.id}
              className="glass-card rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => setPreviewUser(user)}
                    className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full cursor-pointer"
                    title="Preview Profile"
                  >
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all"
                    />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isMutual && (
                      <Link
                        to={`/3d-lab?select=${user.id}`}
                        className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="Inspect Bond in 3D"
                      >
                        <Boxes className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewUser(user)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setPreviewUser(user)}
                    className="text-left text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors leading-tight cursor-pointer"
                  >
                    {user.name}
                  </button>
                  <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                </div>

                <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {user.bio}
                </p>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Network className="h-3 w-3 text-indigo-400" />
                  <span>{mutualBonds.length} mutual {mutualBonds.length === 1 ? 'bond' : 'bonds'} in network</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {isMutual ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                      <Check className="h-3.5 w-3.5" />
                      Mutual Bond
                    </span>
                    <Link
                      to={`/3d-lab?select=${user.id}`}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      View in 3D →
                    </Link>
                  </div>
                ) : needsConnectBack ? (
                  <button
                    type="button"
                    onClick={() => connectBack(user.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Connect Back</span>
                  </button>
                ) : isPendingSent ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Request Sent
                  </button>
                ) : isPendingReceived ? (
                  <button
                    type="button"
                    onClick={() => acceptConnection(conn!.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept Request
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendConnectionRequest(user.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-20 glass-card rounded-3xl border border-slate-200/80 p-8 max-w-md mx-auto shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <UsersIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {query ? 'No matching peers' : 'No other users yet.'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {query 
              ? `No users found matching "${query}".`
              : 'No other users have joined yet. When new members create accounts, they will appear here.'}
          </p>
        </div>
      )}

      {/* Profile Preview Modal (With Server-Side Authorization Protection) */}
      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl glass-panel border border-slate-200/90 bg-white/95 p-6 sm:p-8 shadow-2xl relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewUser(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-4">
              <img
                src={previewUser.avatar_url}
                alt={previewUser.name}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-indigo-50 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">
                    {previewUser.name}
                  </h3>
                  {isUserMutual(previewUser.id) && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Mutual
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">@{previewUser.username}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <Network className="h-3.5 w-3.5" />
                    {getAcceptedConnections(previewUser.id).length} Mutual Bonds
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Bio
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {previewUser.bio || 'No bio provided.'}
              </p>
            </div>

            {/* Server-Side Authorized Social Section */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Social Accounts
                </h4>
                {authorizedProfile && !authorizedProfile.canViewConnectedSection && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Mutual connection unlocks private links
                  </span>
                )}
              </div>

              {loadingProfile ? (
                <p className="text-xs text-slate-400 animate-pulse">Checking authorization...</p>
              ) : authorizedProfile?.socialProfiles && authorizedProfile.socialProfiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {authorizedProfile.socialProfiles.map((sp: any) => (
                    <a
                      key={sp.id}
                      href={sp.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors text-xs text-slate-700"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getPlatformIcon(sp.platform)}
                        <span className="truncate capitalize font-medium">{sp.platform}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {authorizedProfile?.canViewConnectedSection
                    ? 'No social accounts linked.'
                    : 'Private to mutual connections.'}
                </p>
              )}
            </div>

            {/* Modal Relationship Actions */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
              {(() => {
                if (isUserMutual(previewUser.id)) {
                  return (
                    <Link
                      to={`/3d-lab?select=${previewUser.id}`}
                      onClick={() => setPreviewUser(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      <span>View in 3D Lab</span>
                    </Link>
                  );
                }
                if (canConnectBack(previewUser.id)) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        connectBack(previewUser.id);
                        setPreviewUser(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Connect Back</span>
                    </button>
                  );
                }
                const conn = currentUser ? getConnectionBetween(currentUser.id, previewUser.id) : undefined;
                if ((conn?.status === 'PENDING' || conn?.status === 'REQUESTED') && conn.requester_id === currentUser?.id) {
                  return (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                      Request Pending
                    </span>
                  );
                }
                if ((conn?.status === 'PENDING' || conn?.status === 'REQUESTED') && conn.receiver_id === currentUser?.id) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        acceptConnection(conn.id);
                        setPreviewUser(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept Request</span>
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() => {
                      sendConnectionRequest(previewUser.id);
                      setPreviewUser(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Connect</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
