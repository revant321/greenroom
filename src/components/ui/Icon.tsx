/**
 * Icon set — line icons, 1.6–1.8 stroke, rounded caps, currentColor.
 * Use as <Icon.Name size={N} color={...} />. Sizes default to ~18-20.
 */

type IconProps = { size?: number; color?: string };

const ChevronLeft = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size * 0.6} height={size} viewBox="0 0 12 20" fill="none" aria-hidden>
    <path d="M10 2L2 10l8 8" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = ({ size = 14, color = 'rgba(255,255,255,0.4)' }: IconProps) => (
  <svg width={size * 0.57} height={size} viewBox="0 0 8 14" aria-hidden>
    <path d="M1 1l6 6-6 6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Ellipsis = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size * 0.27} viewBox="0 0 22 6" aria-hidden>
    <circle cx="3" cy="3" r="2.2" fill={color} />
    <circle cx="11" cy="3" r="2.2" fill={color} />
    <circle cx="19" cy="3" r="2.2" fill={color} />
  </svg>
);

const Trophy = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 4h10v4a5 5 0 01-10 0V4z" stroke={color} strokeWidth="1.7" />
    <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" stroke={color} strokeWidth="1.7" />
    <path d="M10 13v3M14 13v3M8 19h8M9 16h6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const Plus = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const Note = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M9 18V6l10-2v12" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="18" r="2.2" stroke={color} strokeWidth="1.7" />
    <circle cx="17" cy="16" r="2.2" stroke={color} strokeWidth="1.7" />
  </svg>
);

const SceneBoard = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.7" />
    <path d="M3 10h18" stroke={color} strokeWidth="1.7" />
  </svg>
);

const Mic = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="9" y="3" width="6" height="12" rx="3" stroke={color} strokeWidth="1.8" />
    <path d="M5 11a7 7 0 0014 0M12 18v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Video = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size * 1.1} height={size} viewBox="0 0 24 20" fill="none" aria-hidden>
    <rect x="2" y="3" width="15" height="14" rx="2.5" stroke={color} strokeWidth="1.8" />
    <path d="M17 8l5-3v10l-5-3V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const Play = ({ size = 14, color = '#fff' }: IconProps) => (
  <svg width={size} height={size * 1.14} viewBox="0 0 14 16" aria-hidden>
    <path d="M2 2v12l10-6L2 2z" fill={color} />
  </svg>
);

const Pause = ({ size = 12, color = '#fff' }: IconProps) => (
  <svg width={size} height={size * 1.17} viewBox="0 0 12 14" aria-hidden>
    <rect x="1" y="1" width="3" height="12" rx="1" fill={color} />
    <rect x="8" y="1" width="3" height="12" rx="1" fill={color} />
  </svg>
);

const Check = ({ size = 14, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
    <path d="M2 7l3.5 3.5L12 3.5" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Download = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 20h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Trash = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Gear = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.7" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const Icon = {
  ChevronLeft, ChevronRight, Ellipsis, Trophy, Plus, Note, SceneBoard,
  Mic, Video, Play, Pause, Check, Download, Trash, Gear,
};
