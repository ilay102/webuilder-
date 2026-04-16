/**
 * Design Packs — automated visual variance for client sites.
 *
 * Each pack = coordinated color palette + font pair + radius + shadow + hero blend.
 * Assigned to a client deterministically by slug hash (see lib/variance.ts).
 * Two clients with different slugs will (almost) never look identical.
 *
 * The `vibe` field is fed into Gemini when generating copy so the written voice
 * matches the visual tone (a "luxe midnight" pack gets confident/aspirational copy;
 * a "forest soft" pack gets warm/nurturing copy).
 */

export interface DesignPack {
  id:   string
  name: string
  vibe: string // short phrase fed to AI — describes brand personality for copy matching
  colors: {
    bg:           string
    bgAlt:        string
    white:        string
    primary:      string  // main brand color (forest equivalent)
    primaryDark:  string
    accent:       string  // secondary (oak equivalent)
    accentLight:  string
    text:         string
    muted:        string
    light:        string
  }
  fonts: {
    heading: { family: string; weights: string }
    body:    { family: string; weights: string }
  }
  radius:  number        // base border-radius in px
  shadow:  'none' | 'soft' | 'dramatic'
  /**
   * Hero overlay — the premium part. This tints any stock photo so it feels
   * on-brand. `blend` + `gradient` combine with the photo using CSS mix-blend-mode.
   */
  heroOverlay: {
    blend:    string  // CSS mix-blend-mode: multiply | soft-light | overlay | color | screen
    gradient: string  // CSS gradient string — the color wash
    opacity:  number  // 0..1 on the overlay element
  }
  photoFilter: string  // CSS filter applied to all stock photos site-wide
}

/* ─────────── The 12 packs ─────────── */

export const PACKS: DesignPack[] = [
  {
    id: 'forest-serif-soft',
    name: 'Forest · Serif · Soft',
    vibe: 'warm, nurturing, natural, calm — like a thoughtful boutique clinic',
    colors: {
      bg: '#FAF8F4', bgAlt: '#F2EFE9', white: '#FFFFFF',
      primary: '#2D6B55', primaryDark: '#1F4D3C',
      accent: '#C9956A', accentLight: '#E8D5C0',
      text: '#2A2A2A', muted: '#7A6F66', light: '#B0A89E',
    },
    fonts: {
      heading: { family: 'Plus Jakarta Sans', weights: '400;600;700;800' },
      body:    { family: 'Manrope',            weights: '400;500;600' },
    },
    radius: 20, shadow: 'soft',
    heroOverlay: {
      blend: 'multiply',
      gradient: 'linear-gradient(135deg, rgba(45,107,85,0.55) 0%, rgba(45,107,85,0.12) 65%, transparent 100%)',
      opacity: 1,
    },
    photoFilter: 'saturate(1.05)',
  },
  {
    id: 'navy-sans-sharp',
    name: 'Navy · Sans · Sharp',
    vibe: 'confident, direct, trustworthy, premium — established professional practice',
    colors: {
      bg: '#F8FAFC', bgAlt: '#EEF2F7', white: '#FFFFFF',
      primary: '#1B3A5C', primaryDark: '#0F2540',
      accent: '#E8A547', accentLight: '#F9E4B8',
      text: '#0F172A', muted: '#475569', light: '#94A3B8',
    },
    fonts: {
      heading: { family: 'Manrope', weights: '500;700;800' },
      body:    { family: 'Inter',   weights: '400;500;600' },
    },
    radius: 6, shadow: 'dramatic',
    heroOverlay: {
      blend: 'soft-light',
      gradient: 'linear-gradient(120deg, rgba(27,58,92,0.85) 0%, rgba(27,58,92,0.35) 50%, transparent 100%)',
      opacity: 0.95,
    },
    photoFilter: 'saturate(0.92) contrast(1.05)',
  },
  {
    id: 'coral-warm-friendly',
    name: 'Coral · Warm · Friendly',
    vibe: 'approachable, energetic, friendly, modern — family-oriented, welcoming',
    colors: {
      bg: '#FFF9F5', bgAlt: '#FDEEDF', white: '#FFFFFF',
      primary: '#E76F51', primaryDark: '#C0553B',
      accent: '#264653', accentLight: '#F4A261',
      text: '#2B2B2B', muted: '#735C52', light: '#B5A197',
    },
    fonts: {
      heading: { family: 'Fraunces', weights: '400;600;700' },
      body:    { family: 'DM Sans',  weights: '400;500;700' },
    },
    radius: 24, shadow: 'soft',
    heroOverlay: {
      blend: 'overlay',
      gradient: 'linear-gradient(135deg, rgba(231,111,81,0.7) 0%, rgba(244,162,97,0.3) 60%, transparent 100%)',
      opacity: 0.92,
    },
    photoFilter: 'saturate(1.15) contrast(1.02)',
  },
  {
    id: 'charcoal-mono-tech',
    name: 'Charcoal · Mono · Tech',
    vibe: 'clinical-precise, minimalist, high-tech, surgical confidence',
    colors: {
      bg: '#FAFAFA', bgAlt: '#F0F0F0', white: '#FFFFFF',
      primary: '#1A1A1A', primaryDark: '#000000',
      accent: '#E11D48', accentLight: '#FECDD3',
      text: '#111111', muted: '#6B7280', light: '#D1D5DB',
    },
    fonts: {
      heading: { family: 'Space Grotesk', weights: '500;600;700' },
      body:    { family: 'Inter',         weights: '400;500;600' },
    },
    radius: 2, shadow: 'dramatic',
    heroOverlay: {
      blend: 'color',
      gradient: 'linear-gradient(120deg, rgba(26,26,26,0.8) 0%, rgba(26,26,26,0.4) 60%, transparent 100%)',
      opacity: 0.85,
    },
    photoFilter: 'grayscale(0.85) contrast(1.08)',
  },
  {
    id: 'teal-modern-airy',
    name: 'Teal · Modern · Airy',
    vibe: 'fresh, modern, calm-tech, wellness-forward',
    colors: {
      bg: '#F0FDFA', bgAlt: '#CCFBF1', white: '#FFFFFF',
      primary: '#0D9488', primaryDark: '#115E59',
      accent: '#F59E0B', accentLight: '#FDE68A',
      text: '#042F2E', muted: '#5EEAD4', light: '#99F6E4',
    },
    fonts: {
      heading: { family: 'Outfit', weights: '400;600;700' },
      body:    { family: 'Inter',  weights: '400;500;600' },
    },
    radius: 14, shadow: 'soft',
    heroOverlay: {
      blend: 'soft-light',
      gradient: 'linear-gradient(135deg, rgba(13,148,136,0.6) 0%, rgba(13,148,136,0.2) 55%, transparent 100%)',
      opacity: 0.95,
    },
    photoFilter: 'saturate(0.95) brightness(1.04)',
  },
  {
    id: 'ivory-editorial-classic',
    name: 'Ivory · Editorial · Classic',
    vibe: 'elegant, editorial, refined, old-world craftsmanship — boutique premium',
    colors: {
      bg: '#F5F1E8', bgAlt: '#EDE5D3', white: '#FFFFFF',
      primary: '#7D2D3D', primaryDark: '#5C1F2B',
      accent: '#9B7E46', accentLight: '#D8C9A8',
      text: '#2A1F1A', muted: '#806B5E', light: '#B0A08E',
    },
    fonts: {
      heading: { family: 'Cormorant Garamond', weights: '500;600;700' },
      body:    { family: 'Inter',              weights: '400;500;600' },
    },
    radius: 8, shadow: 'soft',
    heroOverlay: {
      blend: 'multiply',
      gradient: 'linear-gradient(120deg, rgba(125,45,61,0.55) 0%, rgba(155,126,70,0.2) 60%, transparent 100%)',
      opacity: 1,
    },
    photoFilter: 'sepia(0.1) saturate(0.95)',
  },
  {
    id: 'midnight-luxe-gold',
    name: 'Midnight · Luxe · Gold',
    vibe: 'luxury, exclusive, aspirational, high-end clinic — confident and distinctive',
    colors: {
      bg: '#0F172A', bgAlt: '#1E293B', white: '#F8FAFC',
      primary: '#D4AF37', primaryDark: '#B89028',
      accent: '#F4E4BC', accentLight: '#334155',
      text: '#F8FAFC', muted: '#CBD5E1', light: '#64748B',
    },
    fonts: {
      heading: { family: 'Marcellus', weights: '400' },
      body:    { family: 'Jost',      weights: '300;400;500;600' },
    },
    radius: 14, shadow: 'dramatic',
    heroOverlay: {
      blend: 'color',
      gradient: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(212,175,55,0.25) 70%, transparent 100%)',
      opacity: 0.9,
    },
    photoFilter: 'contrast(1.1) brightness(0.95)',
  },
  {
    id: 'sand-minimal-zen',
    name: 'Sand · Minimal · Zen',
    vibe: 'serene, grounded, minimal, mindful — spa-like calm',
    colors: {
      bg: '#F7F3ED', bgAlt: '#EDE4D3', white: '#FFFFFF',
      primary: '#B05B3B', primaryDark: '#8B4226',
      accent: '#6B7F5A', accentLight: '#D0CCA9',
      text: '#2B2218', muted: '#807060', light: '#BCAE99',
    },
    fonts: {
      heading: { family: 'DM Serif Display', weights: '400' },
      body:    { family: 'Work Sans',        weights: '400;500;600' },
    },
    radius: 10, shadow: 'soft',
    heroOverlay: {
      blend: 'multiply',
      gradient: 'linear-gradient(120deg, rgba(176,91,59,0.45) 0%, rgba(107,127,90,0.2) 60%, transparent 100%)',
      opacity: 0.95,
    },
    photoFilter: 'saturate(0.9) brightness(1.02)',
  },
  {
    id: 'rose-gentle-feminine',
    name: 'Rose · Gentle · Feminine',
    vibe: 'gentle, caring, feminine, soft — perfect for aesthetic/cosmetic focus',
    colors: {
      bg: '#FDF2F6', bgAlt: '#FBE2EC', white: '#FFFFFF',
      primary: '#B03A5B', primaryDark: '#8B2647',
      accent: '#8B6F8B', accentLight: '#E8C9D6',
      text: '#2B1A22', muted: '#8A6876', light: '#C5A4B1',
    },
    fonts: {
      heading: { family: 'Tenor Sans', weights: '400' },
      body:    { family: 'Poppins',    weights: '300;400;500;600' },
    },
    radius: 22, shadow: 'soft',
    heroOverlay: {
      blend: 'soft-light',
      gradient: 'linear-gradient(135deg, rgba(176,58,91,0.55) 0%, rgba(139,111,139,0.25) 60%, transparent 100%)',
      opacity: 0.9,
    },
    photoFilter: 'saturate(1.05) brightness(1.03)',
  },
  {
    id: 'emerald-pro-trust',
    name: 'Emerald · Pro · Trust',
    vibe: 'professional, trustworthy, growth-oriented, established practice',
    colors: {
      bg: '#F8FAF9', bgAlt: '#E8F0EC', white: '#FFFFFF',
      primary: '#047857', primaryDark: '#064E3B',
      accent: '#D97706', accentLight: '#FED7AA',
      text: '#1F2937', muted: '#4B5563', light: '#9CA3AF',
    },
    fonts: {
      heading: { family: 'Lora',  weights: '500;600;700' },
      body:    { family: 'Inter', weights: '400;500;600' },
    },
    radius: 10, shadow: 'soft',
    heroOverlay: {
      blend: 'overlay',
      gradient: 'linear-gradient(135deg, rgba(4,120,87,0.6) 0%, rgba(4,120,87,0.2) 55%, transparent 100%)',
      opacity: 0.9,
    },
    photoFilter: 'saturate(1.0)',
  },
  {
    id: 'amber-friendly-family',
    name: 'Amber · Friendly · Family',
    vibe: 'cheerful, welcoming, family-friendly, optimistic — neighborhood clinic feel',
    colors: {
      bg: '#FFFBEB', bgAlt: '#FEF3C7', white: '#FFFFFF',
      primary: '#D97706', primaryDark: '#92400E',
      accent: '#3B82F6', accentLight: '#FDE68A',
      text: '#3A2B12', muted: '#78614C', light: '#BFA882',
    },
    fonts: {
      heading: { family: 'Rubik', weights: '500;600;700' },
      body:    { family: 'Inter', weights: '400;500;600' },
    },
    radius: 18, shadow: 'soft',
    heroOverlay: {
      blend: 'multiply',
      gradient: 'linear-gradient(135deg, rgba(217,119,6,0.55) 0%, rgba(217,119,6,0.15) 60%, transparent 100%)',
      opacity: 0.95,
    },
    photoFilter: 'saturate(1.12) brightness(1.04)',
  },
  {
    id: 'slate-tech-clean',
    name: 'Slate · Tech · Clean',
    vibe: 'cutting-edge, technical, precise, future-focused — advanced technology clinic',
    colors: {
      bg: '#F8FAFC', bgAlt: '#E2E8F0', white: '#FFFFFF',
      primary: '#0891B2', primaryDark: '#155E75',
      accent: '#7C3AED', accentLight: '#A5F3FC',
      text: '#0F172A', muted: '#64748B', light: '#94A3B8',
    },
    fonts: {
      heading: { family: 'IBM Plex Sans', weights: '500;600;700' },
      body:    { family: 'Inter',         weights: '400;500;600' },
    },
    radius: 4, shadow: 'soft',
    heroOverlay: {
      blend: 'soft-light',
      gradient: 'linear-gradient(120deg, rgba(8,145,178,0.65) 0%, rgba(124,58,237,0.2) 55%, transparent 100%)',
      opacity: 0.92,
    },
    photoFilter: 'saturate(0.98) contrast(1.03)',
  },
]

/* ─────────── Helpers ─────────── */

export const PACK_IDS = PACKS.map(p => p.id)

export function getPack(id?: string | null): DesignPack {
  return PACKS.find(p => p.id === id) ?? PACKS[0]
}

/** Build a Google Fonts URL for a pack (to inject via <link>). */
export function googleFontsUrl(pack: DesignPack): string {
  const h = pack.fonts.heading
  const b = pack.fonts.body
  const enc = (s: string) => encodeURIComponent(s.trim())
  return `https://fonts.googleapis.com/css2?family=${enc(h.family)}:wght@${h.weights}&family=${enc(b.family)}:wght@${b.weights}&display=swap`
}
