import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const LandingFooter: React.FC = () => {

  return (
    <footer className="border-t border-slate-200/60 bg-[#FAF9F5] py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 leading-none">Boring</span>
            <span className="text-[10px] text-slate-400 mt-0.5">See your social world in 3D</span>
          </div>
        </div>

        {/* Minimal Navigation */}
        <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 font-medium text-slate-600">
          <a href="#concept" className="hover:text-slate-900 transition-colors">
            Concept
          </a>
          <a href="#story" className="hover:text-slate-900 transition-colors">
            Story
          </a>
          <Link to="/settings" className="hover:text-slate-900 transition-colors">
            Privacy
          </Link>
        </nav>

        {/* Auth / Action links */}
        <div className="flex items-center gap-4">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Login →
          </a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200/40 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Boring. A spatial social network platform.
      </div>
    </footer>
  );
};
