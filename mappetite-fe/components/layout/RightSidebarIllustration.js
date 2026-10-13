export default function RightSidebarIllustration({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 p-3 select-none ${className}`}>
      {/* Folded Map & Pin Sticker SVG */}
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-16 h-auto drop-shadow-sm shrink-0"
      >
        {/* Folded map sections */}
        <polygon points="10,32 36,25 36,65 10,72" fill="#E8E4D5" stroke="#D3CEBE" strokeWidth="1" />
        <polygon points="36,25 64,32 64,72 36,65" fill="#DDD8C7" stroke="#CAC4B2" strokeWidth="1" />
        <polygon points="64,32 90,25 90,65 64,72" fill="#ECE8DB" stroke="#D3CEBE" strokeWidth="1" />

        {/* Map route lines */}
        <path d="M18 55 Q 36 45, 50 52 T 80 44" stroke="#9EA98F" strokeWidth="2.5" strokeDasharray="3 2" fill="none" />

        {/* Map pin */}
        <g transform="translate(42, 12)">
          {/* Pin Shadow */}
          <ellipse cx="8" cy="38" rx="6" ry="2.5" fill="#3D4A2D" opacity="0.25" />
          {/* Pin Body */}
          <path
            d="M8 38 C 3 24, -2 18, -2 10 A 10 10 0 0 1 18 10 C 18 18, 13 24, 8 38 Z"
            fill="#D96338"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          {/* Pin Inner Dot */}
          <circle cx="8" cy="10" r="4" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Handwriting Typography */}
      <div className="flex flex-col text-xs font-serif italic text-[#576449] leading-tight tracking-wide">
        <span className="font-semibold text-sm text-[#404D33] not-italic">Save</span>
        <span>Explore</span>
        <span className="font-semibold text-[#D96338]">Enjoy</span>
      </div>
    </div>
  );
}
