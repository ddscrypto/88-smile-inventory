/**
 * 88 Smile Designs logo — exact match to official branding
 * Three hollow rings (green top-left, red top-right, yellow bottom-center)
 * touching in a triangle arrangement, vertical blue separator, SMILE designs text
 */

// Icon-only (rings only) — used in nav header and as app icon base
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Circles: r=28, stroke=5. Centers form equilateral triangle.
  // Green: (28, 28), Red: (72, 28), Yellow: (50, 70)
  // Distance between top centers = 44, diameter = 56 → they overlap slightly (touching/kissing)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 98"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green ring — top left */}
      <circle cx="28" cy="30" r="24" stroke="#2e9e44" strokeWidth="5" fill="none" />
      {/* Red ring — top right */}
      <circle cx="72" cy="30" r="24" stroke="#cc2936" strokeWidth="5" fill="none" />
      {/* Yellow ring — bottom center */}
      <circle cx="50" cy="68" r="24" stroke="#e6a817" strokeWidth="5" fill="none" />
    </svg>
  );
}

// Wide version with text — for lock screen and staff login
export function LogoWide({ height = 48, className = "" }: { height?: number; className?: string }) {
  const width = height * 3.8;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 228 60"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green ring — top left */}
      <circle cx="18" cy="22" r="15" stroke="#2e9e44" strokeWidth="3.5" fill="none" />
      {/* Red ring — top right */}
      <circle cx="48" cy="22" r="15" stroke="#cc2936" strokeWidth="3.5" fill="none" />
      {/* Yellow ring — bottom center */}
      <circle cx="33" cy="42" r="15" stroke="#e6a817" strokeWidth="3.5" fill="none" />
      {/* Vertical blue separator line */}
      <line x1="74" y1="6" x2="74" y2="54" stroke="#3b82f6" strokeWidth="1.5" />
      {/* SMILE — bold blue */}
      <text x="84" y="30" fill="#1d4ed8" fontSize="23" fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        letterSpacing="1">SMILE</text>
      {/* designs — lighter blue */}
      <text x="84" y="50" fill="#3b82f6" fontSize="19" fontWeight="300"
        fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        letterSpacing="0.5">designs</text>
    </svg>
  );
}
