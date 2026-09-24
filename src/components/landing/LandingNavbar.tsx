import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const LandingNavbar: React.FC = () => {

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-[#FAF9F5]/85 backdrop-blur-xl transition-all duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900 leading-none">
            Boring
          </span>
        </Link>

        {/* Minimal Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600">
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

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-all hover:gap-2 cursor-pointer"
          >
            <span>Login →</span>
          </a>
        </div>
      </div>
    </header>
  );
};
