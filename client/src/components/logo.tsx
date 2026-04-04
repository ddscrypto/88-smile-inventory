/**
 * 88 Smile Designs logo — exact match to official branding
 * Three hollow rings (green top-left, red top-right, yellow bottom-center)
 * touching in a triangle arrangement, vertical blue separator, SMILE designs text
 */

// Icon-only (rings only) — used in nav header and as app icon base
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Layout matches official logo:
  //   Green (top-left) + Red (top-right) side by side, touching
  //   Yellow below Red, touching Red only — NOT touching Green
  // r=22, centers 44px apart = exactly touching
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green ring — top left */}
      <circle cx="24" cy="24" r="21" stroke="#2e9e44" strokeWidth="4.5" fill="none" />
      {/* Red ring — top right, touches green */}
      <circle cx="68" cy="24" r="21" stroke="#cc2936" strokeWidth="4.5" fill="none" />
      {/* Yellow ring — below red, touches red only */}
      <circle cx="68" cy="68" r="21" stroke="#e6a817" strokeWidth="4.5" fill="none" />
    </svg>
  );
}

// Wide version with text — for lock screen and staff login
export function LogoWide({ height = 48, className = "" }: { height?: number; className?: string }) {
  const width = height * 4.2;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 252 60"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Rings group: green top-left, red top-right, yellow below-right */}
      {/* r=13, touching = centers 26px apart */}
      {/* Green — top left */}
      <circle cx="15" cy="16" r="13" stroke="#2e9e44" strokeWidth="3" fill="none" />
      {/* Red — top right, touching green */}
      <circle cx="41" cy="16" r="13" stroke="#cc2936" strokeWidth="3" fill="none" />
      {/* Yellow — below red, touching red only */}
      <circle cx="41" cy="42" r="13" stroke="#e6a817" strokeWidth="3" fill="none" />
      {/* Vertical blue separator */}
      <line x1="65" y1="4" x2="65" y2="56" stroke="#3b82f6" strokeWidth="1.5" />
      {/* SMILE — bold blue */}
      <text x="76" y="28" fill="#1d4ed8" fontSize="22" fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        letterSpacing="1">SMILE</text>
      {/* designs — lighter blue */}
      <text x="76" y="49" fill="#3b82f6" fontSize="18" fontWeight="300"
        fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        letterSpacing="0.5">designs</text>
    </svg>
  );
}
