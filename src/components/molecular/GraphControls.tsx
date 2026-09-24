import React from 'react';
import { RotateCcw, X, ArrowUpRight, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../../types';

interface GraphControlsProps {
  selectedUser: User | null;
  neighbors?: User[];
  onSelectNeighbor?: (id: string) => void;
  onClearSelection: () => void;
  onResetCamera: () => void;
  nodeCount: number;
  bondCount: number;
  hideTopBadges?: boolean;
  hideResetButton?: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  selectedUser,
  neighbors = [],
  onSelectNeighbor,
  onClearSelection,
  onResetCamera,
  nodeCount,
  bondCount,
  hideTopBadges = false,
  hideResetButton = false,
}) => {
  return (
    <>
      {/* Top status & graph metrics badge */}
      {!hideTopBadges && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs text-slate-600 font-medium border border-white/80 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>{nodeCount} Nodes</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{bondCount} Mutual Bonds</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera and Interaction Controls */}
      {!hideResetButton && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={onResetCamera}
            title="Reset Camera Position"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md border border-slate-200/80 hover:bg-white hover:text-indigo-600 transition-all backdrop-blur-md"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subtle interaction instructions */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
        <div className="rounded-xl px-3 py-1.5 text-[11px] text-slate-400 font-medium tracking-wide border border-slate-800 bg-[#0B0F19]/80 backdrop-blur-md shadow-lg">
          Rotate: Left-drag &nbsp;•&nbsp; Pan: Right-drag &nbsp;•&nbsp; Zoom: Scroll
        </div>
      </div>

      {/* Selected Node Profile Drawer (Node Inspection) */}
      {selectedUser && (
        <div className="absolute top-16 right-4 z-20 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-[#0B0F19]/95 border border-slate-800/90 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.avatar_url}
                alt={selectedUser.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-xs"
              />
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">
                  {selectedUser.name}
                </h4>
                <p className="text-xs text-slate-400 font-mono">@{selectedUser.username}</p>
              </div>
            </div>
            <button
              onClick={onClearSelection}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Close inspection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            {selectedUser.bio}
          </p>

          {/* Immediate Neighbors (Connected Nodes) */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-indigo-400" />
                Connected Neighbors ({neighbors.length})
              </span>
            </div>

            {neighbors.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {neighbors.map(neighbor => (
                  <button
                    key={neighbor.id}
                    type="button"
                    onClick={() => onSelectNeighbor?.(neighbor.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1 text-[11px] text-slate-300 hover:bg-indigo-950/60 hover:border-indigo-500/50 hover:text-white transition-all shadow-xs"
                    title={`Focus on ${neighbor.name}`}
                  >
                    <img src={neighbor.avatar_url} alt={neighbor.name} className="h-3.5 w-3.5 rounded-full object-cover" />
                    <span className="truncate max-w-[90px]">{neighbor.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No mutual bonds connected to this node.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
            <Link
              to="/people"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>Explore in People</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
