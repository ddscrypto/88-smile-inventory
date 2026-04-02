/**
 * 88 Smile Designs logo components
 * Three solid filled balls: green (top-left), red (top-right), yellow (bottom-center)
 * Touching but separate — not overlapping like a Venn diagram
 */

// Icon-only version — for small spaces like nav headers
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Three solid balls arranged in a triangle, touching but separate
  // r=28, centers spaced so circles just touch (distance = 2*r = 56)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 96"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green ball — top left */}
      <circle cx="28" cy="28" r="26" fill="#16a34a" />
      {/* subtle highlight */}
      <circle cx="20" cy="20" r="8" fill="white" fillOpacity="0.25" />
      {/* Red ball — top right */}
      <circle cx="72" cy="28" r="26" fill="#dc2626" />
      <circle cx="64" cy="20" r="8" fill="white" fillOpacity="0.25" />
      {/* Yellow ball — bottom center */}
      <circle cx="50" cy="70" r="26" fill="#eab308" />
      <circle cx="42" cy="62" r="8" fill="white" fillOpacity="0.25" />
    </svg>
  );
}

// Wide version with text — for lock screen and staff login
export function LogoWide({ height = 48, className = "" }: { height?: number; className?: string }) {
  const width = height * 3.4;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 204 60"
      fill="none"
      aria-label="88 Smile Designs"
      className={className}
    >
      {/* Green ball */}
      <circle cx="16" cy="22" r="15" fill="#16a34a" />
      <circle cx="11" cy="17" r="5" fill="white" fillOpacity="0.25" />
      {/* Red ball */}
      <circle cx="46" cy="22" r="15" fill="#dc2626" />
      <circle cx="41" cy="17" r="5" fill="white" fillOpacity="0.25" />
      {/* Yellow ball */}
      <circle cx="31" cy="43" r="15" fill="#eab308" />
      <circle cx="26" cy="38" r="5" fill="white" fillOpacity="0.25" />
      {/* Vertical separator */}
      <line x1="70" y1="6" x2="70" y2="54" stroke="#94a3b8" strokeWidth="1.5" />
      {/* SMILE text */}
      <text x="80" y="29" fill="#1e40af" fontSize="22" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1.5">SMILE</text>
      {/* designs text */}
      <text x="80" y="50" fill="#3b82f6" fontSize="17" fontWeight="300" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1">designs</text>
    </svg>
  );
}
