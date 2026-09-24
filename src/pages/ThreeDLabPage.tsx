import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { MolecularGraph, MolecularGraphHandle } from '../components/molecular/MolecularGraph';
import { LayoutOptions } from '../components/molecular/graphLayout';
import { Sparkles, Sliders, ArrowLeft, RefreshCw, RotateCcw, Maximize2, X } from 'lucide-react';

const DEFAULT_LAYOUT: LayoutOptions = {
  repulsion: 80,
  springLength: 4.5,
  iterations: 50,
  damping: 0.85,
};

export const ThreeDLabPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectParam = searchParams.get('select');

  const { users, connections, selectedNodeId, setSelectedNodeId } = useNetwork();
  const graphRef = useRef<MolecularGraphHandle>(null);

  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions>(DEFAULT_LAYOUT);
  const [showTuning, setShowTuning] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [graphMetrics, setGraphMetrics] = useState({
    nodeCount: users.length,
    bondCount: connections.filter(c => c.status === 'ACCEPTED').length,
  });

  useEffect(() => {
    if (selectParam) {
      setSelectedNodeId(selectParam);
    }
  }, [selectParam, setSelectedNodeId]);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    // Force a fresh calculation pass
    setLayoutOptions(prev => ({ ...prev }));
    setTimeout(() => setIsRecalculating(false), 300);
  };

  const handleResetDefaults = () => {
    setLayoutOptions(DEFAULT_LAYOUT);
  };

  const handleFitNetwork = () => {
    graphRef.current?.fitNetwork();
  };

  const handleResetView = () => {
    graphRef.current?.resetView();
  };

  const acceptedBondsCount = connections.filter(c => c.status === 'ACCEPTED').length;
  const displayNodeCount = graphMetrics.nodeCount || users.length;
  const displayBondCount = graphMetrics.bondCount || acceptedBondsCount;

  return (
    <div className="relative w-full h-full bg-[#060810] overflow-hidden flex-1 flex flex-col text-slate-100">
      {/* Top Left Floating Header Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 sm:gap-3">
        <Link
          to="/profile"
          className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/85 px-3 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-all shadow-lg backdrop-blur-md"
          title="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Boring</span>
        </Link>

        <div className="rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 border border-slate-800 bg-slate-900/85 shadow-lg backdrop-blur-md">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-white tracking-tight">
            3D Workspace
          </span>
          <div className="sm:hidden flex items-center gap-1 text-[11px] text-slate-400 border-l border-slate-800 pl-2 ml-1">
            <span>{displayNodeCount}N</span>
            <span>·</span>
            <span>{displayBondCount}B</span>
          </div>
        </div>
      </div>

      {/* Top Right Floating Controls Overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Minimal Information HUD: [ X Nodes ] · [ Y Bonds ] */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/85 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-md shadow-lg">
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

        {/* Layout Tuning Button */}
        <button
          type="button"
          onClick={() => setShowTuning(!showTuning)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold backdrop-blur-md border transition-all shadow-lg ${
            showTuning
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'border-slate-700/80 bg-slate-900/85 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600'
          }`}
          title="Configure Layout Parameters"
        >
          <Sliders className="h-3.5 w-3.5 text-indigo-400" />
          <span>Layout</span>
        </button>

        {/* Fit Network Button */}
        <button
          type="button"
          onClick={handleFitNetwork}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border border-slate-700/80 bg-slate-900/85 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition-all shadow-lg backdrop-blur-md"
          title="Fit complete network into viewport"
        >
          <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Fit Network</span>
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetView}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border border-slate-700/80 bg-slate-900/85 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition-all shadow-lg backdrop-blur-md"
          title="Reset View to default overview"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* Floating Layout Tuning Panel */}
      {showTuning && (
        <div className="absolute top-16 right-4 z-30 w-80 rounded-3xl bg-[#0B0F19]/95 border border-slate-800 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Classical Layout Tuning</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTuning(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 py-3 text-xs">
            {/* Repulsion */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Node Repulsion:</span>
                <span className="font-mono text-indigo-400 font-semibold">{layoutOptions.repulsion}</span>
              </div>
              <input
                type="range"
                min={30}
                max={180}
                step={5}
                value={layoutOptions.repulsion}
                onChange={e =>
                  setLayoutOptions(prev => ({ ...prev, repulsion: Number(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Push force separating non-bonded nodes</span>
            </div>

            {/* Spring Length */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Bond Spring Length:</span>
                <span className="font-mono text-indigo-400 font-semibold">{layoutOptions.springLength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={8.0}
                step={0.5}
                value={layoutOptions.springLength}
                onChange={e =>
                  setLayoutOptions(prev => ({ ...prev, springLength: Number(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Target spatial distance between mutual bonds</span>
            </div>

            {/* Relaxation Iterations */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Relaxation Passes:</span>
                <span className="font-mono text-indigo-400 font-semibold">{layoutOptions.iterations}</span>
              </div>
              <input
                type="range"
                min={20}
                max={120}
                step={10}
                value={layoutOptions.iterations}
                onChange={e =>
                  setLayoutOptions(prev => ({ ...prev, iterations: Number(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Force relaxation convergence iterations</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleRecalculate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Bleed 3D Molecular Graph */}
      <div className="w-full h-full flex-1">
        <MolecularGraph
          ref={graphRef}
          users={users}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          layoutOptions={layoutOptions}
          height="100%"
          showControls={true}
          hideTopBadges={true}
          hideResetButton={true}
          onMetricsChange={setGraphMetrics}
        />
      </div>

      {/* Single-Node / Waiting State Card when no mutual bonds exist */}
      {displayBondCount === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-sm w-full px-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19]/90 p-4 text-center backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Personal Molecular Identity</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              Your molecular network is waiting for its first mutual connection.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Connect with people to build your 3D network.
            </p>
            <Link
              to="/people"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs"
            >
              <span>Discover People →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

