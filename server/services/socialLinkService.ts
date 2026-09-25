/**
 * Social Link Service
 * Provides robust URL validation, canonical normalization, deterministic domain detection,
 * platform icon mapping, and assistive AI classification for unknown domains.
 *
 * Invariants:
 * - URL is the authoritative source of truth.
 * - Deterministic domain detection is authoritative for known platforms.
 * - AI is strictly assistive for unknown domains and can NEVER modify the URL.
 * - No arbitrary remote image scraping or CORS bypasses.
 */

export interface DetectedSocialPlatform {
  platform: 'instagram' | 'github' | 'linkedin' | 'youtube' | 'x' | 'facebook' | 'scholar' | 'other';
  displayName: string;
  iconId: string;
  isKnown: boolean;
}

export interface ProcessedSocialLink {
  valid: boolean;
  error?: string;
  rawUrl: string;
  normalizedUrl: string;
  canonicalUrl: string;
  hostname: string;
  platform: 'instagram' | 'github' | 'linkedin' | 'youtube' | 'x' | 'facebook' | 'scholar' | 'other';
  platformDisplayName: string;
  iconId: string;
  displayHandle: string;
}

// Deterministic map of supported domain names to platforms
const KNOWN_DOMAINS: Record<string, { platform: DetectedSocialPlatform['platform']; displayName: string; iconId: string }> = {
  'instagram.com': { platform: 'instagram', displayName: 'Instagram', iconId: 'instagram' },
  'github.com': { platform: 'github', displayName: 'GitHub', iconId: 'github' },
  'linkedin.com': { platform: 'linkedin', displayName: 'LinkedIn', iconId: 'linkedin' },
  'youtube.com': { platform: 'youtube', displayName: 'YouTube', iconId: 'youtube' },
  'x.com': { platform: 'x', displayName: 'X', iconId: 'x' },
  'twitter.com': { platform: 'x', displayName: 'X', iconId: 'x' },
  'facebook.com': { platform: 'facebook', displayName: 'Facebook', iconId: 'facebook' },
  'scholar.google.com': { platform: 'scholar', displayName: 'Google Scholar', iconId: 'scholar' },
};

// Platform icon identifier lookup
export const PLATFORM_ICON_MAP: Record<string, string> = {
  instagram: 'instagram',
  github: 'github',
  linkedin: 'linkedin',
  youtube: 'youtube',
  x: 'x',
  facebook: 'facebook',
  scholar: 'scholar',
  website: 'globe',
  other: 'globe',
};

/**
 * Validates whether a raw string is a safe, well-formed HTTP/HTTPS URL.
 * Rejects javascript:, data:, file:, vbscript:, malformed hosts, and XSS vectors.
 */
export function validateSocialUrl(input: string): { valid: boolean; error?: string; parsed?: URL } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = input.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum allowable length (2048 characters)' };
  }

  // Check for dangerous protocol injections or control characters
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are permitted' };
  }

  // Prepend https:// if user omitted protocol for convenience, e.g. "github.com/user"
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // If it starts with another scheme like "ftp://" reject it
    if (/^[a-z0-9+.-]+:\/\//i.test(candidate)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are permitted' };
    }
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are permitted' };
    }

    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.length < 3) {
      return { valid: false, error: 'URL must contain a valid domain name' };
    }

    // Hostname must not contain invalid characters
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
      return { valid: false, error: 'URL hostname contains invalid characters' };
    }

    return { valid: true, parsed };
  } catch {
    return { valid: false, error: 'Malformed URL. Please enter a valid web address' };
  }
}

/**
 * Normalizes a URL:
 * - Forces https protocol
 * - Lowercases hostname
 * - Strips standard ports (:80, :443)
 * - Resolves known alias hostnames (e.g. www.instagram.com -> instagram.com, twitter.com -> x.com)
 * - Trims trailing slash from path (except for root domain)
 */
export function normalizeSocialUrl(parsed: URL): { normalizedUrl: string; hostname: string } {
  let hostname = parsed.hostname.toLowerCase();

  // Strip leading www.
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  // Strip mobile prefixes where appropriate
  if (hostname === 'm.youtube.com') hostname = 'youtube.com';
  if (hostname === 'youtu.be') hostname = 'youtube.com';
  if (hostname === 'm.facebook.com' || hostname === 'fb.com') hostname = 'facebook.com';
  if (hostname === 'twitter.com') hostname = 'x.com';

  // Normalize path: remove trailing slash if not root
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  if (!pathname) {
    pathname = '/';
  }

  // Construct normalized URL (https, normalized hostname, normalized path, preserving search/hash if any)
  const normalizedUrl = `https://${hostname}${pathname}${parsed.search}${parsed.hash}`;

  return {
    normalizedUrl,
    hostname,
  };
}

/**
 * Deterministic domain detector.
 * Identifies the platform strictly based on the normalized domain.
 */
export function detectPlatformFromHostname(hostname: string): DetectedSocialPlatform {
  let cleanHost = hostname.toLowerCase();
  if (cleanHost.startsWith('www.')) {
    cleanHost = cleanHost.slice(4);
  }

  // Direct known mapping
  if (KNOWN_DOMAINS[cleanHost]) {
    const match = KNOWN_DOMAINS[cleanHost];
    return {
      platform: match.platform,
      displayName: match.displayName,
      iconId: match.iconId,
      isKnown: true,
    };
  }

  // Check domain suffixes (e.g., subdomains of linkedin or youtube)
  for (const [knownHost, config] of Object.entries(KNOWN_DOMAINS)) {
    if (cleanHost.endsWith(`.${knownHost}`)) {
      return {
        platform: config.platform,
        displayName: config.displayName,
        iconId: config.iconId,
        isKnown: true,
      };
    }
  }

  // Unknown domain -> fallback to Other
  return {
    platform: 'other',
    displayName: 'Other',
    iconId: 'globe',
    isKnown: false,
  };
}

/**
 * Optional assistive AI classifier for unknown domains.
 * AI is strictly assistive:
 * - Only receives minimum required info: { url, hostname }
 * - CAN NEVER alter the URL or destination
 * - Returns a suggested classification or safely defaults to 'other'
 */
export async function classifyUnknownDomainWithAI(
  url: string,
  hostname: string
): Promise<{ platform: DetectedSocialPlatform['platform']; displayName: string; iconId: string }> {
  // If it's already a known platform, AI must never override deterministic detector
  const deterministic = detectPlatformFromHostname(hostname);
  if (deterministic.isKnown) {
    return deterministic;
  }

  // AI assist check for common tech / developer / community domains without external scraping
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');

  // Deterministic extension rules for recognized public platforms
  if (cleanHost === 'gitlab.com') {
    return { platform: 'other', displayName: 'GitLab', iconId: 'globe' };
  }
  if (cleanHost === 'medium.com') {
    return { platform: 'other', displayName: 'Medium', iconId: 'globe' };
  }
  if (cleanHost === 'threads.net') {
    return { platform: 'other', displayName: 'Threads', iconId: 'globe' };
  }
  if (cleanHost === 'tiktok.com') {
    return { platform: 'other', displayName: 'TikTok', iconId: 'globe' };
  }
  if (cleanHost === 'twitch.tv') {
    return { platform: 'other', displayName: 'Twitch', iconId: 'globe' };
  }
  if (cleanHost === 'discord.gg' || cleanHost === 'discord.com') {
    return { platform: 'other', displayName: 'Discord', iconId: 'globe' };
  }

  // If remote Colab agent is configured, we could ask it for metadata, but if unreachable
  // or domain is unfamiliar, safe fallback is ALWAYS 'other'
  return {
    platform: 'other',
    displayName: 'Other',
    iconId: 'globe',
  };
}

/**
 * Full Pipeline:
 * Validates, normalizes, detects platform, and formats the social profile link.
 */
export async function processSocialLink(
  rawUrl: string,
  rawDisplayHandle?: string,
  _hintPlatform?: string
): Promise<ProcessedSocialLink> {
  const validation = validateSocialUrl(rawUrl);
  if (!validation.valid || !validation.parsed) {
    return {
      valid: false,
      error: validation.error || 'Invalid URL',
      rawUrl,
      normalizedUrl: '',
      canonicalUrl: '',
      hostname: '',
      platform: 'other',
      platformDisplayName: 'Other',
      iconId: 'globe',
      displayHandle: (rawDisplayHandle || '').trim(),
    };
  }

  const { normalizedUrl, hostname } = normalizeSocialUrl(validation.parsed);
  const detected = detectPlatformFromHostname(hostname);

  let platform = detected.platform;
  let displayName = detected.displayName;
  let iconId = detected.iconId;

  if (!detected.isKnown) {
    const aiResult = await classifyUnknownDomainWithAI(normalizedUrl, hostname);
    platform = aiResult.platform;
    displayName = aiResult.displayName;
    iconId = aiResult.iconId;
  }

  // Clean and sanitize display handle (prevent XSS)
  let cleanHandle = (rawDisplayHandle || '').trim().replace(/[<>"/\\`]/g, '');
  if (!cleanHandle) {
    // If handle is empty, derive sensible default from path (e.g. /@username or /username)
    const segments = validation.parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const candidate = segments[segments.length - 1].replace(/^@/, '');
      cleanHandle = candidate ? `@${candidate}` : `@${hostname}`;
    } else {
      cleanHandle = `@${hostname}`;
    }
  } else if (!cleanHandle.startsWith('@') && platform !== 'other') {
    cleanHandle = `@${cleanHandle}`;
  }

  return {
    valid: true,
    rawUrl,
    normalizedUrl,
    canonicalUrl: normalizedUrl, // Canonical destination remains authoritative
    hostname,
    platform,
    platformDisplayName: displayName,
    iconId,
    displayHandle: cleanHandle,
  };
}
