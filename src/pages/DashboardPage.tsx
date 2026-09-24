import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { MolecularGraph } from '../components/molecular/MolecularGraph';
import { Users, Network, ArrowRight, UserCheck, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    users,
    connections,
    selectedNodeId,
    setSelectedNodeId,
    getAcceptedConnections,
  } = useNetwork();

  const userAccepted = currentUser ? getAcceptedConnections(currentUser.id) : [];
  const pendingRequests = connections.filter(
    c => c.status === 'PENDING' && c.receiver_id === currentUser?.id
  );

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
            Welcome, <span className="font-semibold">{currentUser?.name || 'Explorer'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your personal molecular network in interactive 3D space.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/people"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>Find People</span>
          </Link>
          <Link
            to="/3d-lab"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors"
          >
            <span>Open 3D Lab</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Main 3D Network Canvas (Centered as signature feature) */}
      <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-md">
        <MolecularGraph
          users={users}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      </div>

      {/* Quick Summary Cards below the 3D center */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Accepted Bonds</p>
              <p className="text-lg font-semibold text-slate-900">{userAccepted.length} Mutual</p>
            </div>
          </div>
          <Link to="/network" className="text-xs text-indigo-600 font-semibold hover:underline">
            View
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Pending Requests</p>
              <p className="text-lg font-semibold text-slate-900">{pendingRequests.length} Received</p>
            </div>
          </div>
          <Link to="/network" className="text-xs text-indigo-600 font-semibold hover:underline">
            Manage
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Network Size</p>
              <p className="text-lg font-semibold text-slate-900">{users.length} Nodes</p>
            </div>
          </div>
          <Link to="/people" className="text-xs text-indigo-600 font-semibold hover:underline">
            Explore
          </Link>
        </div>
      </div>
    </div>
  );
};
