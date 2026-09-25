import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { UserCheck, X, Clock, UserPlus, Inbox, Send, ArrowRight, Sparkles } from 'lucide-react';
import { UserAvatar } from '../components/common/UserAvatar';

export const RequestsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    users,
    connections,
    acceptConnection,
    rejectConnection,
    cancelConnection,
    connectBack,
    isUserMutual,
  } = useNetwork();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  // 1. Pending incoming requests
  const pendingReceived = connections.filter(
    c => (c.status === 'PENDING' || c.status === 'REQUESTED') && c.receiver_id === currentUser?.id
  );

  // 2. Accepted one-way incoming relationships that require "Connect Back" to become mutual
  const connectBackRequired = connections.filter(
    c => (c.status === 'ACCEPTED_ONE_WAY' || c.status === 'ACCEPTED') &&
         c.receiver_id === currentUser?.id &&
         !isUserMutual(c.requester_id)
  );

  // 3. Pending outgoing sent requests
  const pendingSent = connections.filter(
    c => (c.status === 'PENDING' || c.status === 'REQUESTED') && c.requester_id === currentUser?.id
  );

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900 tracking-tight">
            Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming connection requests and complete reciprocal Connect Backs to form 3D molecular bonds.
          </p>
        </div>

        <Link
          to="/people"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-white hover:border-slate-400 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
          <span>Discover People</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 mb-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'received'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Received ({pendingReceived.length + connectBackRequired.length})</span>
          {(pendingReceived.length > 0 || connectBackRequired.length > 0) && (
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'sent'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Sent ({pendingSent.length})</span>
        </button>
      </div>

      {/* Tab 1: Received Requests & Connect Back */}
      {activeTab === 'received' && (
        <div className="space-y-6">
          {/* Section A: Connect Back Required (Accepted One-Way) */}
          {connectBackRequired.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-900">
                  Connect Back to Form 3D Bond ({connectBackRequired.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 px-1">
                You accepted these requests. Connect back reciprocally to establish mutuality, unlock connected profiles, and form molecular bonds.
              </p>

              {connectBackRequired.map(conn => {
                const sender = users.find(u => u.id === conn.requester_id);
                if (!sender) return null;

                return (
                  <div
                    key={conn.id}
                    className="glass-card rounded-2xl p-5 border-2 border-indigo-200 bg-indigo-50/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <UserAvatar
                        avatarUrl={sender.avatar_url}
                        name={sender.name}
                        size="md"
                        className="ring-2 ring-indigo-300 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">{sender.name}</h4>
                          <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            Accepted One-Way
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">@{sender.username}</p>
                        {sender.bio && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1 max-w-md">
                            {sender.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => connectBack(sender.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Connect Back</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section B: Pending Incoming Requests */}
          <div className="space-y-4">
            {pendingReceived.length === 0 && connectBackRequired.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-200/80">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No connection requests yet.</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  When other peers reach out to connect with you, their requests will appear here for your review.
                </p>
                <Link
                  to="/people"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-xs"
                >
                  <span>Browse people</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              pendingReceived.map(conn => {
                const sender = users.find(u => u.id === conn.requester_id);
                if (!sender) return null;

                return (
                  <div
                    key={conn.id}
                    className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <UserAvatar
                        avatarUrl={sender.avatar_url}
                        name={sender.name}
                        size="md"
                        className="ring-2 ring-indigo-100 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{sender.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">@{sender.username}</p>
                        {sender.bio && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1 max-w-md">
                            {sender.bio}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Received {new Date(conn.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => acceptConnection(conn.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectConnection(conn.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Sent Requests */}
      {activeTab === 'sent' && (
        <div className="space-y-4">
          {pendingSent.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-200/80">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No sent requests pending</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                You haven&apos;t sent any connection requests awaiting a response.
              </p>
              <Link
                to="/people"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-xs"
              >
                <span>Find people to connect with</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            pendingSent.map(conn => {
              const recipient = users.find(u => u.id === conn.receiver_id);
              if (!recipient) return null;

              return (
                <div
                  key={conn.id}
                  className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      avatarUrl={recipient.avatar_url}
                      name={recipient.name}
                      size="md"
                      className="ring-2 ring-slate-100 shrink-0"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{recipient.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">@{recipient.username}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full mt-1 font-medium">
                        <Clock className="h-3 w-3" />
                        Pending acceptance
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => cancelConnection(conn.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors self-end sm:self-auto"
                  >
                    <span>Cancel Request</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
