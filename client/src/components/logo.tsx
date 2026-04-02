/**
 * 88 Smile Designs logo components
 * Three overlapping circles: green (top-left), red/pink (top-right), yellow (bottom-center)
 * Matches the practice's official branding from your88smiles.com
 */

// Icon-only version (3 circles) — for small spaces like nav headers
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green circle — top left */}
      <circle cx="35" cy="32" r="24" stroke="#1a9e5c" strokeWidth="5" fill="none" />
      {/* Red/pink circle — top right */}
      <circle cx="65" cy="32" r="24" stroke="#c72e5c" strokeWidth="5" fill="none" />
      {/* Yellow circle — bottom center */}
      <circle cx="50" cy="64" r="24" stroke="#f5c518" strokeWidth="5" fill="none" />
    </svg>
  );
}

// Wide version with text — for lock screen and staff login
export function LogoWide({ height = 48, className = "" }: { height?: number; className?: string }) {
  const aspectRatio = 320 / 100;
  const width = height * aspectRatio;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 320 100"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green circle — top left */}
      <circle cx="30" cy="30" r="22" stroke="#1a9e5c" strokeWidth="4.5" fill="none" />
      {/* Red/pink circle — top right */}
      <circle cx="60" cy="30" r="22" stroke="#c72e5c" strokeWidth="4.5" fill="none" />
      {/* Yellow circle — bottom center */}
      <circle cx="45" cy="60" r="22" stroke="#f5c518" strokeWidth="4.5" fill="none" />
      {/* Vertical separator line */}
      <line x1="90" y1="8" x2="90" y2="92" stroke="#3b8fce" strokeWidth="2" />
      {/* SMILE text */}
      <text x="100" y="44" fill="#3b8fce" fontSize="36" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="2">SMILE</text>
      {/* designs text */}
      <text x="100" y="78" fill="#3b8fce" fontSize="32" fontWeight="300" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1">designs</text>
    </svg>
  );
}
