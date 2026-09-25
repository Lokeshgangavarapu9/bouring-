import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { MolecularGraph, MolecularGraphHandle } from '../components/molecular/MolecularGraph';
import { UserAvatar } from '../components/common/UserAvatar';
import { getMoleculeIdentity } from '../components/molecule/moleculeIdentities';
import {
  Maximize2,
  RotateCcw,
  X,
  ArrowRight,
  UserCheck,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';

export const ThreeDLabPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectParam = searchParams.get('select');
  const navigate = useNavigate();

  const { currentUser } = useAuth();
  const { users, connections, selectedNodeId, setSelectedNodeId, isUserMutual } = useNetwork();
  const graphRef = useRef<MolecularGraphHandle>(null);

  const [graphMetrics, setGraphMetrics] = useState({
    nodeCount: users.length,
    bondCount: connections.filter(c => c.status === 'ACCEPTED').length,
  });

  useEffect(() => {
    if (selectParam) {
      setSelectedNodeId(selectParam);
    }
  }, [selectParam, setSelectedNodeId]);

  const handleFitNetwork = () => {
    graphRef.current?.fitNetwork();
  };

  const handleResetView = () => {
    graphRef.current?.resetView();
  };

  const selectedUser = users.find(u => u.id === selectedNodeId) || null;
  const isSelectedSelf = selectedUser?.id === currentUser?.id;
  const isSelectedMutual = selectedUser ? isUserMutual(selectedUser.id) : false;

  const displayNodeCount = graphMetrics.nodeCount || users.length;
  const displayBondCount = graphMetrics.bondCount || connections.filter(c => c.status === 'ACCEPTED').length;

  return (
    <div className="relative w-full h-full bg-[#060810] overflow-hidden flex-1 flex flex-col text-slate-100 select-none">
      {/* Top Floating Minimal Info Bar: [ X Nodes · Y Bonds ] */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md shadow-xl">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-white font-semibold">{displayNodeCount}</span> Nodes
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="text-white font-semibold">{displayBondCount}</span> Bonds
          </span>
        </div>
      </div>

      {/* Left Compact Camera & Navigation Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl border border-slate-800/80 bg-slate-950/85 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={handleFitNetwork}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Fit complete network into viewport"
          >
            <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Fit Network</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Reset 360° overview"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Main Full-Bleed 3D Molecular Graph */}
      <div className="w-full h-full flex-1">
        <MolecularGraph
          ref={graphRef}
          users={users}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          height="100%"
          showControls={false}
          hideTopBadges={true}
          hideResetButton={true}
          onMetricsChange={setGraphMetrics}
        />
      </div>

      {/* Subtle interaction instructions */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:block pointer-events-none">
        <div className="rounded-xl px-3 py-1.5 text-[11px] text-slate-400 font-medium tracking-wide border border-slate-800/70 bg-[#0B0F19]/80 backdrop-blur-md shadow-lg">
          Rotate: Drag &nbsp;•&nbsp; Pan: Right-drag &nbsp;•&nbsp; Click: Node / Bond &nbsp;•&nbsp; 360° View
        </div>
      </div>

      {/* Compact Selected Person / Bond Interaction Card (Requirements 25 & 26) */}
      {selectedUser && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-30 w-80 sm:w-88 rounded-3xl border border-slate-800/90 bg-[#0B0F19]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                avatarUrl={selectedUser.avatar_url}
                name={selectedUser.name}
                size="md"
                className="ring-2 ring-indigo-500/30 shrink-0"
              />
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-white leading-tight truncate">
                    {selectedUser.name}
                  </h4>
                  {isSelectedSelf && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">@{selectedUser.username}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close inspection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Molecule Identity & Relationship Pill */}
          <div className="flex items-center justify-between mt-3 py-1.5 px-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span className="font-medium">
                {getMoleculeIdentity(
                  isSelectedSelf
                    ? (currentUser?.moleculeIdentity || selectedUser.moleculeIdentity)
                    : selectedUser.moleculeIdentity
                ).name}
              </span>
            </div>

            {isSelectedSelf ? (
              <span className="text-[10px] text-slate-400 font-medium">Host Molecule</span>
            ) : isSelectedMutual ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <UserCheck className="h-3 w-3" />
                <span>Mutual Bond Active</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Public Node</span>
            )}
          </div>

          {/* Bio text */}
          {selectedUser.bio && (
            <p className="mt-3 text-xs text-slate-300 line-clamp-3 leading-relaxed">
              {selectedUser.bio}
            </p>
          )}

          {/* View Profile Action (Navigates directly to selected person's existing profile) */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {isSelectedSelf
                ? 'Your personal profile'
                : isSelectedMutual
                ? 'Connected profile access granted'
                : 'Public summary view'}
            </span>

            <button
              type="button"
              onClick={() => {
                navigate(isSelectedSelf ? '/profile' : `/profile?userId=${selectedUser.id}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>View Profile</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Waiting state when no mutual bonds exist yet */}
      {displayBondCount === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-auto max-w-md px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/85 px-4 py-2.5 shadow-xl backdrop-blur-md">
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium text-slate-200">
                Your network starts here.
              </p>
              <p className="text-[11px] text-slate-400">
                Connect with someone to form your first 3D molecular bond.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <span>Discover People</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
