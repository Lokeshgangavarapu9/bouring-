import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { Network, Check, X, Boxes, Clock, UserPlus } from 'lucide-react';

export const NetworkPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    users,
    connections,
    acceptConnection,
    rejectConnection,
    cancelConnection,
    getAcceptedConnections,
  } = useNetwork();

  const [activeTab, setActiveTab] = useState<'bonds' | 'requests'>('bonds');

  const accepted = currentUser ? getAcceptedConnections(currentUser.id) : [];
  const pendingReceived = connections.filter(
    c => c.status === 'PENDING' && c.receiver_id === currentUser?.id
  );
  const pendingSent = connections.filter(
    c => c.status === 'PENDING' && c.requester_id === currentUser?.id
  );

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900">
            My <span className="font-semibold">Network</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your verified social bonds and incoming connection requests.
          </p>
        </div>

        <Link
          to="/3d-lab"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
        >
          <Boxes className="h-4 w-4" />
          <span>Launch 3D Lab</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('bonds')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'bonds'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Network className="h-4 w-4" />
          <span>Accepted Bonds ({accepted.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Pending Requests ({pendingReceived.length + pendingSent.length})</span>
        </button>
      </div>

      {/* Tab 1: Accepted Mutual Bonds */}
      {activeTab === 'bonds' && (
        <div>
          {accepted.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Network className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No mutual bonds yet</h3>
              <p className="text-xs text-slate-500 mt-2">
                Bonds are formed when both users accept a connection. Discover people and connect to create your first bond.
              </p>
              <Link
                to="/people"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Find People</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accepted.map(conn => {
                const otherUserId = conn.requester_id === currentUser?.id ? conn.receiver_id : conn.requester_id;
                const otherUser = users.find(u => u.id === otherUserId);
                if (!otherUser) return null;

                return (
                  <div key={conn.id} className="glass-card rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{otherUser.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">@{otherUser.username}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Connected Bond
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/3d-lab?select=${otherUser.id}`}
                      title="Inspect in 3D"
                      className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Boxes className="h-5 w-5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Received Requests ({pendingReceived.length})
            </h3>
            {pendingReceived.length === 0 ? (
              <p className="text-xs text-slate-400">No pending received requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingReceived.map(conn => {
                  const requester = users.find(u => u.id === conn.requester_id);
                  if (!requester) return null;

                  return (
                    <div key={conn.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={requester.avatar_url} alt={requester.name} className="h-10 w-10 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{requester.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">@{requester.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => acceptConnection(conn.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                          title="Accept Connection"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => rejectConnection(conn.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Sent Requests ({pendingSent.length})
            </h3>
            {pendingSent.length === 0 ? (
              <p className="text-xs text-slate-400">No sent requests pending approval.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingSent.map(conn => {
                  const receiver = users.find(u => u.id === conn.receiver_id);
                  if (!receiver) return null;

                  return (
                    <div key={conn.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={receiver.avatar_url} alt={receiver.name} className="h-10 w-10 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{receiver.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">@{receiver.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelConnection(conn.id)}
                        className="text-xs text-rose-600 hover:underline font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
