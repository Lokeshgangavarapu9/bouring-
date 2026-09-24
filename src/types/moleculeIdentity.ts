export type MoleculeIdentityId =
  // 12 Zodiac identities (New visual specification)
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'
  // Default neutral identity (PDF Page 18)
  | 'default'
  // Backwards-compatible aliases for existing mock data
  | 'neptune'
  | 'aurora'
  | 'solar'
  | 'comet'
  | 'moon'
  | 'eclipse'
  | 'nebula'
  | 'crystal'
  | 'luna'
  | 'ocean'
  | 'violet';

export type MoleculeCategory = 'zodiac' | 'default';

export interface MoleculeIdentityConfig {
  id: MoleculeIdentityId;
  name: string;
  symbol?: string;
  category: MoleculeCategory;
  motif: string;
  tagline: string;
  description: string;
  // Visual treatment cues matching the PDF Comet specification
  theme: {
    baseTone: string;
    internalWispColor: string;
    secondaryWispColor?: string;
    glowColor: string;
    specularHighlight: string;
    wispStyle:
      | 'curved-luminous'
      | 'botanical-surface'
      | 'dual-orbit'
      | 'watery-cloud'
      | 'golden-radiance'
      | 'mint-leaf'
      | 'silky-bands'
      | 'smoky-sweep'
      | 'diagonal-trail'
      | 'mineral-curved'
      | 'flowing-wisps'
      | 'dual-flowing'
      | 'neutral-pearl';
  };
  previewColors: [string, string, string]; // [sphere, nucleus, glow]
  node: {
    sphereColor: string;
    sphereSelectedColor: string;
    sphereNeighborColor: string;
    sphereHoveredColor: string;
    emissiveColor: string;
    emissiveSelectedColor: string;
    emissiveNeighborColor: string;
    emissiveHoveredColor: string;
    emissiveIntensity: number;
    selectedEmissiveIntensity: number;
    nucleusColor: string;
    nucleusSelectedColor: string;
    nucleusNeighborColor: string;
    nucleusEmissiveColor: string;
    nucleusEmissiveIntensity: number;
    roughness: number;
    metalness: number;
    transmission: number;
    thickness: number;
    ior: number;
    opacity: number;
    glowColor: string;
    labelColor: string;
    labelOutlineColor: string;
  };
}
