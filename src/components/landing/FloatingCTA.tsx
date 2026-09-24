import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight } from 'lucide-react';

export const FloatingCTA: React.FC = () => {
  const { currentUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const finalCtaEl = document.getElementById('final-cta');

      // Hide if near the hero (less than 320px scroll)
      const isPastHero = scrollY > 320;

      // Hide if near the final CTA section
      let isNearFinalCta = false;
      if (finalCtaEl) {
        const rect = finalCtaEl.getBoundingClientRect();
        // If final CTA top is within 500px of viewport bottom
        if (rect.top <= window.innerHeight - 80) {
          isNearFinalCta = true;
        }
      }

      setIsVisible(isPastHero && !isNearFinalCta);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const destination = currentUser ? '/3d-lab' : '/auth';
  const label = currentUser ? 'Open your 3D network' : 'Build your network';

  return (
    <div
      className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          : 'opacity-0 translate-y-4 pointer-events-none scale-95'
      }`}
    >
      <Link
        to={destination}
        className="group inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/95 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xl backdrop-blur-xl hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all"
      >
        <span className="text-indigo-400 text-xs font-bold">✦</span>
        <span>{label}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white" />
      </Link>
    </div>
  );
};
