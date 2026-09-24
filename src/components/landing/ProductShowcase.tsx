import React, { useState } from 'react';
import { Boxes, Network, UserCheck, ShieldCheck } from 'lucide-react';

export const ProductShowcase: React.FC = () => {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

  const steps = [
    {
      title: 'Person',
      subtitle: 'The Individual Node',
      desc: 'Each person occupies a distinct position in 3D space, characterized by verified identity and personal coordinates.',
      badge: 'Step 01',
    },
    {
      title: 'Connections',
      subtitle: 'Mutually Verified Bonds',
      desc: 'Only accepted, two-way ties form translucent structural bonds. Asymmetric follows or pending requests never clutter the scene.',
      badge: 'Step 02',
    },
    {
      title: 'Structure',
      subtitle: 'The Organic Geometry',
      desc: 'Shared relationships pull mutual friends into balanced geometric clusters, revealing communities and clusters intuitively.',
      badge: 'Step 03',
    },
  ];

  return (
    <div id="concept" className="w-full bg-[#FAF9F5] text-slate-900 overflow-hidden">
      {/* SECTION A — MEET YOUR NETWORK */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-slate-200/60">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-medium text-indigo-700 shadow-xs">
                <Network className="h-3.5 w-3.5 text-indigo-600" />
                <span>Spatial Social Architecture</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-slate-900 leading-[1.15]">
                Meet your <br />
                <span className="font-semibold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">
                  network.
                </span>
              </h2>

              <p className="text-base text-slate-600 leading-relaxed">
                See the people around you and the relationships that connect them. Instead of an endless feed of disconnected posts, Boring renders your mutual connections as a living, spatial structure.
              </p>

              <div className="pt-2 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Mutual Verification Only</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Bonds only exist where both people have confirmed their relationship.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Clarity Over Noise</h4>
                    <p className="text-xs text-slate-500 mt-0.5">No algorithmic feeds, no behavioral ad profiling, just clean social topology.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Large Visual Showcase */}
            <div className="lg:col-span-7 relative">
              {/* Decorative background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-tr from-indigo-200/40 to-violet-200/30 rounded-full blur-3xl pointer-events-none" />

              <div className="relative rounded-3xl border border-white/80 bg-white/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/50">
                {/* Visual mock showing nodes and connection links */}
                <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#0C1021] overflow-hidden p-6 text-white flex flex-col justify-between">
                  {/* Subtle Grid overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                  {/* Header info */}
                  <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono text-slate-300">CLUSTER 01 • ACTIVE EQUILIBRIUM</span>
                    </div>
                    <span className="text-xs font-mono text-indigo-300">5 NODES • 7 BONDS</span>
                  </div>

                  {/* Nodes & Connections illustration */}
                  <div className="relative flex-1 flex items-center justify-center">
                    {/* SVG connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-indigo-400/40 stroke-1" xmlns="http://www.w3.org/2000/svg">
                      <line x1="50%" y1="50%" x2="25%" y2="30%" strokeDasharray="3 3" />
                      <line x1="50%" y1="50%" x2="75%" y2="28%" />
                      <line x1="50%" y1="50%" x2="30%" y2="72%" />
                      <line x1="50%" y1="50%" x2="72%" y2="70%" />
                      <line x1="25%" y1="30%" x2="75%" y2="28%" strokeDasharray="2 2" />
                      <line x1="30%" y1="72%" x2="72%" y2="70%" />
                    </svg>

                    {/* Center Focal Node */}
                    <div className="relative z-20 flex flex-col items-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-400 p-0.5 shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20">
                        <div className="h-full w-full rounded-full bg-slate-900/40 backdrop-blur-sm flex items-center justify-center text-white font-serif text-lg font-bold">
                          You
                        </div>
                      </div>
                      <span className="mt-2 text-xs font-semibold text-white tracking-wide">Focal Perspective</span>
                    </div>

                    {/* Surrounding Connected Nodes */}
                    <div className="absolute top-[20%] left-[16%] flex items-center gap-2 bg-slate-800/80 backdrop-blur-md rounded-full py-1 pl-1 pr-3 border border-indigo-400/30">
                      <div className="h-7 w-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-200">
                        AC
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold leading-tight">Alex Chen</p>
                        <p className="text-[9px] text-slate-400 leading-tight">4 mutual bonds</p>
                      </div>
                    </div>

                    <div className="absolute top-[18%] right-[16%] flex items-center gap-2 bg-slate-800/80 backdrop-blur-md rounded-full py-1 pl-1 pr-3 border border-violet-400/30">
                      <div className="h-7 w-7 rounded-full bg-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-200">
                        ER
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold leading-tight">Elena Rostova</p>
                        <p className="text-[9px] text-slate-400 leading-tight">6 mutual bonds</p>
                      </div>
                    </div>

                    <div className="absolute bottom-[20%] left-[20%] flex items-center gap-2 bg-slate-800/80 backdrop-blur-md rounded-full py-1 pl-1 pr-3 border border-cyan-400/30">
                      <div className="h-7 w-7 rounded-full bg-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-200">
                        MV
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold leading-tight">Marcus Vance</p>
                        <p className="text-[9px] text-slate-400 leading-tight">3 mutual bonds</p>
                      </div>
                    </div>

                    <div className="absolute bottom-[18%] right-[18%] flex items-center gap-2 bg-slate-800/80 backdrop-blur-md rounded-full py-1 pl-1 pr-3 border border-indigo-400/30">
                      <div className="h-7 w-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-200">
                        SK
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold leading-tight">Sarah Kim</p>
                        <p className="text-[9px] text-slate-400 leading-tight">5 mutual bonds</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom caption */}
                  <div className="relative z-10 text-center text-xs text-slate-400">
                    Real-time physics equilibrium balances mutual attraction and spatial distance.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION B — EVERY CONNECTION HAS A PLACE */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9F5] via-[#F5F3EC] to-[#FAF9F5]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Interactive 3-Stage Progression Visual */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="relative rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-8 backdrop-blur-xl shadow-lg">
                {/* Step Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    {steps.map((s, idx) => (
                      <button
                        key={s.title}
                        onClick={() => setActiveStep(idx as 0 | 1 | 2)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          activeStep === idx
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span>{s.badge}</span>
                        <span>{s.title}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline-block">Click step to inspect</span>
                </div>

                {/* Demonstration Stage Canvas */}
                <div className="relative h-72 sm:h-80 w-full rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 border border-slate-200/60 overflow-hidden flex items-center justify-center">
                  {/* Subtle Grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

                  {/* STAGE 0: Person */}
                  {activeStep === 0 && (
                    <div className="relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-400 p-1 shadow-xl shadow-indigo-500/25">
                        <div className="h-full w-full rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-indigo-700 font-serif text-2xl font-bold">
                          P
                        </div>
                        {/* Pulse waves */}
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-40" />
                      </div>
                      <div className="mt-4 rounded-full bg-white px-3 py-1 border border-slate-200 shadow-xs text-xs font-semibold text-slate-800">
                        1 Person → 1 Spatial Node
                      </div>
                    </div>
                  )}

                  {/* STAGE 1: Connections */}
                  {activeStep === 1 && (
                    <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                      {/* Connection Rod */}
                      <div className="absolute w-44 h-1 bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-400 rounded-full shadow-sm" />

                      {/* Left Node */}
                      <div className="absolute left-[24%] flex flex-col items-center">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-400 p-0.5 shadow-md flex items-center justify-center text-white font-serif text-lg font-bold">
                          A
                        </div>
                        <span className="mt-2 text-[11px] font-semibold text-slate-700">Alice</span>
                      </div>

                      {/* Right Node */}
                      <div className="absolute right-[24%] flex flex-col items-center">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-violet-500 to-purple-400 p-0.5 shadow-md flex items-center justify-center text-white font-serif text-lg font-bold">
                          B
                        </div>
                        <span className="mt-2 text-[11px] font-semibold text-slate-700">Bob</span>
                      </div>

                      <div className="absolute bottom-4 bg-white/95 px-3 py-1 rounded-full border border-indigo-200 shadow-xs text-xs font-medium text-indigo-700">
                        Mutual Acceptance = Verified Bond
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: Structure */}
                  {activeStep === 2 && (
                    <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-indigo-300 stroke-2" xmlns="http://www.w3.org/2000/svg">
                        <line x1="50%" y1="32%" x2="32%" y2="68%" />
                        <line x1="50%" y1="32%" x2="68%" y2="68%" />
                        <line x1="32%" y1="68%" x2="68%" y2="68%" />
                      </svg>

                      {/* Top Node */}
                      <div className="absolute top-[22%] flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-indigo-600 text-white font-serif flex items-center justify-center text-base font-bold shadow-md">
                          1
                        </div>
                      </div>

                      {/* Bottom Left Node */}
                      <div className="absolute bottom-[22%] left-[26%] flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-violet-600 text-white font-serif flex items-center justify-center text-base font-bold shadow-md">
                          2
                        </div>
                      </div>

                      {/* Bottom Right Node */}
                      <div className="absolute bottom-[22%] right-[26%] flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-cyan-600 text-white font-serif flex items-center justify-center text-base font-bold shadow-md">
                          3
                        </div>
                      </div>

                      <div className="absolute bottom-4 bg-white/95 px-3 py-1 rounded-full border border-slate-200 shadow-xs text-xs font-medium text-slate-800">
                        3-Node Crystal Structure
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Step Description Bar */}
                <div className="mt-5 text-left">
                  <h4 className="text-sm font-semibold text-slate-900">{steps[activeStep].subtitle}</h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{steps[activeStep].desc}</p>
                </div>
              </div>
            </div>

            {/* Right Narrative */}
            <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/90 px-3.5 py-1 text-xs font-medium text-violet-700 shadow-xs">
                <Boxes className="h-3.5 w-3.5 text-violet-600" />
                <span>The Visual Metaphor</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-slate-900 leading-[1.15]">
                Every connection <br />
                <span className="font-semibold bg-gradient-to-r from-slate-900 via-violet-950 to-indigo-900 bg-clip-text text-transparent">
                  has a place.
                </span>
              </h2>

              <p className="text-base text-slate-600 leading-relaxed">
                Relationships are not linear rows in a database or endless text threads. They have geometry, density, and spatial perspective.
              </p>

              {/* person -> connections -> structure flow */}
              <div className="pt-2 flex items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-700">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">Person</span>
                <span className="text-slate-400">→</span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">Connections</span>
                <span className="text-slate-400">→</span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">Structure</span>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
