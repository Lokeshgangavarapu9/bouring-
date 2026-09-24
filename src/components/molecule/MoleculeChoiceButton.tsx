import React from 'react';
import { MoleculeIdentityConfig } from '../../types';
import { Check } from 'lucide-react';
import { MoleculeVisualMotifSVG } from './MoleculeVisualMotifSVG';

interface MoleculeChoiceButtonProps {
  identity: MoleculeIdentityConfig;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: (id: MoleculeIdentityConfig['id']) => void;
}

export const MoleculeChoiceButton: React.FC<MoleculeChoiceButtonProps> = ({
  identity,
  isSelected,
  isCurrent,
  onSelect,
}) => {
  const { theme, node } = identity;

  return (
    <button
      type="button"
      onClick={() => onSelect(identity.id)}
      className="group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-300 focus:outline-none cursor-pointer"
    >
      {/* Visual Circular Molecule Object with comet-inspired aesthetic */}
      <div
        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
          isSelected
            ? 'scale-110 ring-2 ring-offset-4 ring-offset-[#060810] shadow-[0_0_30px_rgba(255,255,255,0.3)]'
            : 'group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.18)] opacity-90 group-hover:opacity-100'
        }`}
        style={{
          boxShadow: isSelected
            ? `0 0 32px ${theme.glowColor}80`
            : undefined,
        }}
      >
        {/* Outer Circular Molecule Sphere Simulation (SVG with gradient, nucleus, and custom motifs) */}
        <svg
          viewBox="0 0 80 80"
          className="w-full h-full overflow-visible drop-shadow-md"
        >
          <defs>
            {/* Primary Spherical Volumetric Pearl Gradient */}
            <radialGradient
              id={`pearl-base-${identity.id}`}
              cx="32%"
              cy="30%"
              r="68%"
              fx="28%"
              fy="26%"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="25%" stopColor={theme.baseTone} stopOpacity="0.9" />
              <stop offset="60%" stopColor={node.sphereColor} stopOpacity="0.85" />
              <stop offset="85%" stopColor={node.emissiveColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#060810" stopOpacity="0.98" />
            </radialGradient>

            {/* Internal Volumetric Smoky Nucleus */}
            <radialGradient
              id={`pearl-smoke-${identity.id}`}
              cx="38%"
              cy="36%"
              r="60%"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="35%" stopColor={theme.internalWispColor} stopOpacity="0.75" />
              <stop offset="80%" stopColor={node.nucleusSelectedColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={theme.glowColor} stopOpacity="0" />
            </radialGradient>

            {/* Specular Rim Filter */}
            <linearGradient id={`specular-rim-${identity.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* 1. Base Physical Pearl Sphere */}
          <circle
            cx="40"
            cy="40"
            r="27"
            fill={`url(#pearl-base-${identity.id})`}
            stroke={isSelected ? '#FFFFFF' : `url(#specular-rim-${identity.id})`}
            strokeWidth={isSelected ? '1.8' : '1'}
            strokeOpacity={isSelected ? 0.95 : 0.6}
          />

          {/* 2. Soft Internal Smoky Cloud Core */}
          <circle
            cx="40"
            cy="40"
            r="19"
            fill={`url(#pearl-smoke-${identity.id})`}
            style={{
              filter: `drop-shadow(0 0 8px ${theme.glowColor}88)`,
            }}
          />

          {/* 3. Identity-Specific Luminous Wisp Layer */}
          <MoleculeVisualMotifSVG identity={identity} isSelected={isSelected} />

          {/* 4. Top-Left Realistic Specular Curved Highlight */}
          <path
            d="M26 28 C28 23 35 20 42 21 C39 24 33 26 30 31 Z"
            fill="#FFFFFF"
            fillOpacity="0.85"
          />
          <ellipse
            cx="32"
            cy="27"
            rx="3"
            ry="1.8"
            fill="#FFFFFF"
            fillOpacity="0.9"
            transform="rotate(-25 32 27)"
          />

          {/* 5. Delicate Bottom-Right Fresnel Counter-Bounce Reflection */}
          <path
            d="M36 53 C43 53 50 49 53 42 C51 47 45 50 38 50 Z"
            fill="#FFFFFF"
            fillOpacity="0.3"
          />
        </svg>

        {/* Selected or Current indicator check */}
        {isSelected && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md ring-2 ring-[#060810]"
            style={{ backgroundColor: theme.glowColor }}
          >
            <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Label and motif subtitle */}
      <div className="text-center">
        <span
          className={`block text-xs font-semibold tracking-tight transition-colors ${
            isSelected
              ? 'text-white font-bold'
              : 'text-slate-300 group-hover:text-white'
          }`}
        >
          {identity.name}
        </span>

        <span className="block text-[10px] text-slate-400 truncate max-w-[85px]">
          {identity.motif}
        </span>

        {isCurrent && (
          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
            Active
          </span>
        )}
      </div>
    </button>
  );
};
