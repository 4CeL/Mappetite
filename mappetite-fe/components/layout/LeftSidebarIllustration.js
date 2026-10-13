export default function LeftSidebarIllustration({ className = "" }) {
  return (
    <div className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}>
      <div className="relative px-2 pt-2">
        {/* Handwriting Quote */}
        <p className="font-serif italic text-xs leading-snug text-[#5F6D54] mb-2 transform -rotate-1 tracking-wide font-medium">
          Good food<br />
          leads to<br />
          <span className="font-semibold text-[#4A5D3B]">great stories</span>
        </p>

        {/* Illustrated Landscape SVG */}
        <svg
          viewBox="0 0 220 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-sm"
        >
          {/* Back rolling hills */}
          <path
            d="M-10 120 C 30 70, 90 75, 140 90 C 180 102, 210 85, 230 120 Z"
            fill="#B9C7A8"
            opacity="0.6"
          />

          {/* Middle hill */}
          <path
            d="M-10 120 C 40 85, 110 95, 160 80 C 190 70, 220 90, 230 120 Z"
            fill="#9EAF8B"
            opacity="0.85"
          />

          {/* Cottage / House */}
          <g transform="translate(62, 58)">
            {/* House body */}
            <rect x="10" y="18" width="38" height="24" rx="2" fill="#FDFBF7" stroke="#D1CEC5" strokeWidth="1" />
            {/* Terracotta roof */}
            <path d="M7 18 L29 5 L51 18 Z" fill="#D27450" />
            <path d="M29 5 L51 18 L46 18 L29 7 Z" fill="#B95B38" />
            {/* Chimney */}
            <rect x="36" y="7" width="5" height="8" fill="#C26643" />
            {/* Windows */}
            <rect x="15" y="24" width="7" height="7" rx="1" fill="#758A63" />
            <rect x="36" y="24" width="7" height="7" rx="1" fill="#758A63" />
            {/* Door */}
            <rect x="26" y="28" width="6" height="14" rx="1" fill="#5A6D4A" />
            {/* Chimney smoke */}
            <circle cx="39" cy="3" r="1.5" fill="#E2E7DB" opacity="0.7" />
            <circle cx="42" cy="-1" r="2.2" fill="#E2E7DB" opacity="0.5" />
          </g>

          {/* Trees behind and around house */}
          {/* Tree 1 */}
          <ellipse cx="62" cy="74" rx="8" ry="14" fill="#697C56" />
          {/* Tree 2 */}
          <ellipse cx="120" cy="80" rx="9" ry="16" fill="#586C46" />
          <ellipse cx="128" cy="83" rx="7" ry="12" fill="#72875E" />
          {/* Tree 3 */}
          <ellipse cx="48" cy="88" rx="6" ry="10" fill="#7A8E67" />

          {/* Foreground lush hill */}
          <path
            d="M-10 120 C 30 100, 80 96, 130 102 C 180 108, 210 98, 230 120 Z"
            fill="#6E825A"
          />
        </svg>
      </div>
    </div>
  );
}
