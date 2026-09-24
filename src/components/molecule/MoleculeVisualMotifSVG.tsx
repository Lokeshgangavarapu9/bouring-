import React from 'react';
import { MoleculeIdentityConfig } from '../../types';

interface MoleculeVisualMotifSVGProps {
  identity: MoleculeIdentityConfig;
  isSelected?: boolean;
}

/**
 * Renders delicate, soft, smoky luminous wisps and translucent depth layers
 * matching the 12 Zodiac identities + Default in Boring_Molecule_Avatar_Design_Spec.pdf.
 *
 * All designs strictly adhere to the Comet visual language:
 * - Cute, smooth, rounded, glossy, pearl-like
 * - Subtle internal luminous wisps
 * - NO flat icons, NO cartoon glyphs, NO harsh geometry
 */
export const MoleculeVisualMotifSVG: React.FC<MoleculeVisualMotifSVGProps> = ({
  identity,
  isSelected = false,
}) => {
  const { id, theme } = identity;
  const wispColor = theme.internalWispColor;
  const secondaryColor = theme.secondaryWispColor || wispColor;

  switch (id) {
    case 'aries':
      // Soft warm pearlescent orb with delicate curved luminous wisps (PDF Page 2)
      return (
        <g opacity={isSelected ? 0.95 : 0.75} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M26 44 C28 32 36 28 44 32 C48 34 52 38 54 44"
            fill="none"
            stroke={wispColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M32 48 C36 40 44 38 48 42"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      );

    case 'taurus':
      // Soft earthy pearl orb with gentle botanical-like surface wisps (PDF Page 3)
      return (
        <g opacity={isSelected ? 0.95 : 0.75} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M28 46 C29 36 38 32 48 35 C52 37 54 41 53 47"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M34 38 C38 34 44 34 46 38 C44 42 38 42 34 38"
            fill={wispColor}
            opacity="0.4"
          />
        </g>
      );

    case 'gemini':
      // Dual-color orb with two delicate translucent orbit wisps (PDF Page 4)
      return (
        <g opacity={isSelected ? 0.95 : 0.8} style={{ mixBlendMode: 'screen' }}>
          <ellipse
            cx="40"
            cy="40"
            rx="18"
            ry="7"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.2"
            transform="rotate(-26 40 40)"
            opacity="0.8"
          />
          <ellipse
            cx="40"
            cy="40"
            rx="17"
            ry="6.5"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.8"
            transform="rotate(28 40 40)"
            opacity="0.7"
          />
        </g>
      );

    case 'cancer':
      // Watery pearl orb with soft cloud-like translucent layers (PDF Page 5)
      return (
        <g opacity={isSelected ? 0.95 : 0.75} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M26 37 C32 33 46 33 54 38"
            fill="none"
            stroke={wispColor}
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M24 43 C33 39 47 40 56 44"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      );

    case 'leo':
      // Warm golden pearl orb with a gentle inner radiance (PDF Page 6)
      return (
        <g opacity={isSelected ? 1 : 0.85} style={{ mixBlendMode: 'screen' }}>
          <circle
            cx="40"
            cy="40"
            r="12"
            fill={wispColor}
            opacity="0.5"
          />
          <circle
            cx="40"
            cy="40"
            r="6.5"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <path
            d="M28 40 C34 32 46 32 52 40"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.75"
          />
        </g>
      );

    case 'virgo':
      // Clean mint-ivory orb with fine soft leaf-like texture (PDF Page 7)
      return (
        <g opacity={isSelected ? 0.95 : 0.75} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M28 46 C32 36 40 33 52 36"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M33 42 C38 38 43 40 45 45"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      );

    case 'libra':
      // Balanced lilac pearl orb with two silky translucent bands (PDF Page 8)
      return (
        <g opacity={isSelected ? 0.95 : 0.8} style={{ mixBlendMode: 'screen' }}>
          <ellipse
            cx="40"
            cy="36"
            rx="19"
            ry="5.5"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.4"
            transform="rotate(-15 40 36)"
            opacity="0.75"
          />
          <ellipse
            cx="40"
            cy="44"
            rx="18"
            ry="5"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            transform="rotate(15 40 44)"
            opacity="0.65"
          />
        </g>
      );

    case 'scorpio':
      // Deep violet pearl orb with one soft smoky luminous sweep (PDF Page 9)
      return (
        <g opacity={isSelected ? 1 : 0.85} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M25 45 C30 31 46 29 55 42"
            fill="none"
            stroke={wispColor}
            strokeWidth="3.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M32 46 C37 38 46 37 51 44"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      );

    case 'sagittarius':
      // Cool pearl orb with one graceful diagonal light trail (PDF Page 10)
      return (
        <g opacity={isSelected ? 0.95 : 0.8} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M25 51 C32 44 45 35 55 27"
            fill="none"
            stroke={wispColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M29 53 C35 48 44 41 51 34"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>
      );

    case 'capricorn':
      // Soft teal mineral pearl orb with subtle curved texture (PDF Page 11)
      return (
        <g opacity={isSelected ? 0.95 : 0.75} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M27 44 C31 36 43 33 53 40"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M30 48 C35 42 44 40 50 46"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>
      );

    case 'aquarius':
      // Aqua pearl orb wrapped by silky flowing translucent wisps (PDF Page 12)
      return (
        <g opacity={isSelected ? 1 : 0.8} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M25 36 C34 32 44 44 55 38"
            fill="none"
            stroke={wispColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M26 44 C35 39 45 49 55 45"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      );

    case 'pisces':
      // Blue-pink pearl orb with two gentle flowing light wisps (PDF Page 13)
      return (
        <g opacity={isSelected ? 0.95 : 0.8} style={{ mixBlendMode: 'screen' }}>
          <path
            d="M26 38 C34 33 46 36 53 43"
            fill="none"
            stroke={wispColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M28 45 C35 49 46 46 54 39"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      );

    case 'default':
    default:
      // Signature Landing-Page Crystal Molecule
      return (
        <g opacity={isSelected ? 0.95 : 0.8} style={{ mixBlendMode: 'screen' }}>
          {/* Crystal micro-bonds */}
          <line x1="40" y1="40" x2="26" y2="28" stroke="#CBD5E1" strokeWidth="1.4" opacity="0.6" />
          <line x1="40" y1="40" x2="54" y2="30" stroke="#CBD5E1" strokeWidth="1.4" opacity="0.6" />
          <line x1="40" y1="40" x2="30" y2="52" stroke="#CBD5E1" strokeWidth="1.4" opacity="0.6" />
          <line x1="40" y1="40" x2="52" y2="50" stroke="#CBD5E1" strokeWidth="1.4" opacity="0.6" />
          <line x1="40" y1="40" x2="42" y2="22" stroke="#CBD5E1" strokeWidth="1.4" opacity="0.6" />
          <line x1="26" y1="28" x2="42" y2="22" stroke="#CBD5E1" strokeWidth="1.1" opacity="0.45" />
          <line x1="54" y1="30" x2="52" y2="50" stroke="#CBD5E1" strokeWidth="1.1" opacity="0.45" />

          {/* Central glowing core */}
          <circle cx="40" cy="40" r="7" fill={wispColor} opacity="0.8" />
          <circle cx="40" cy="40" r="3.2" fill="#FFFFFF" opacity="0.9" />

          {/* Satellite crystal nodes */}
          <circle cx="26" cy="28" r="4.2" fill="#A78BFA" opacity="0.85" />
          <circle cx="54" cy="30" r="4.5" fill="#67E8F9" opacity="0.85" />
          <circle cx="30" cy="52" r="4.2" fill="#C084FC" opacity="0.85" />
          <circle cx="52" cy="50" r="4.4" fill="#818CF8" opacity="0.85" />
          <circle cx="42" cy="22" r="3.8" fill="#93C5FD" opacity="0.85" />
        </g>
      );
  }
};
