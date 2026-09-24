import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/60 bg-[#FAF9F5]/90 py-10 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-slate-800">Boring</span>
          <span className="text-slate-400">— See your social world in 3D.</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/3d-lab" className="hover:text-slate-800 transition-colors">3D Lab</Link>
          <Link to="/people" className="hover:text-slate-800 transition-colors">People</Link>
          <Link to="/requests" className="hover:text-slate-800 transition-colors">Requests</Link>
          <Link to="/settings" className="hover:text-slate-800 transition-colors">Settings</Link>
        </div>
      </div>
    </footer>
  );
};
