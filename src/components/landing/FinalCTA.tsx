import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export const FinalCTA: React.FC = () => {

  return (
    <section id="final-cta" className="relative py-32 sm:py-44 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9F5] via-[#F4F2EA] to-[#EEEAE0] overflow-hidden">
      {/* Gentle center aura glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-200/30 to-violet-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-3xl text-center relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-medium text-indigo-700 backdrop-blur-md shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Interactive 3D Social Geometry</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-slate-900 leading-[1.1]">
          Ready to see your network <br />
          <span className="font-semibold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">
            differently?
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          Build your network and explore the people and connections that shape it.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-900/15 hover:bg-slate-800 transition-all hover:gap-3 active:scale-95 cursor-pointer"
          >
            <span>Login →</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <p className="pt-4 text-xs text-slate-400 font-medium">
          Mutual connections only &nbsp;•&nbsp; No algorithmic feed &nbsp;•&nbsp; Real-time 3D physics
        </p>
      </div>
    </section>
  );
};
