import React from 'react';
import { HeroMolecule } from '../components/landing/HeroMolecule';
import { MolecularStory } from '../components/landing/MolecularStory';
import { ProductShowcase } from '../components/landing/ProductShowcase';
import { ContrastSection } from '../components/landing/ContrastSection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Sparkles, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5] text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center pt-8 pb-16 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient atmospheric gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-violet-200/20 to-sky-100/40 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Narrative Composition (6 cols) */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-medium text-indigo-700 backdrop-blur-md shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Spatial Relationship Network</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-slate-900 leading-[1.08]">
              See your social world <br />
              <span className="font-semibold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">
                in 3D.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Turn mutual connections into an interactive molecular-inspired structure you can explore.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <a
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all hover:gap-3 active:scale-95 cursor-pointer"
              >
                <span>Login →</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Real-time WebGL physics
              </span>
              <span>•</span>
              <span>Mutual verified ties only</span>
              <span>•</span>
              <span>Zero algorithmic feed</span>
            </div>
          </div>

          {/* Right Floating Molecular Composition (6 cols) - Seamlessly Integrated without box frames */}
          <div className="lg:col-span-6 w-full h-[400px] sm:h-[480px] lg:h-[580px] relative flex items-center justify-center">
            <HeroMolecule className="w-full h-full" />
          </div>

        </div>
      </section>

      {/* 2. SCROLL-DRIVEN MOLECULAR STORY (6 Continuous Narrative Stages) */}
      <section id="story" className="w-full">
        <MolecularStory />
      </section>

      {/* 3. PRODUCT DEMONSTRATION SECTIONS (Large Visual Showcases: A, B, C) */}
      <ProductShowcase />

      {/* 4. CONTRAST SECTION (Deep Midnight Indigo + Luminescent Molecule) */}
      <ContrastSection />

      {/* 5. FINAL CTA */}
      <FinalCTA />
    </div>
  );
};
