// Vector recreation of design/logo-mappetite.png (pin with fork & spoon, map, orange accents).

export function LogoMark({ className = "size-10", title }) {
  return (
    <svg
      viewBox="420 280 420 440"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill="#A1A889">
        <path d="M436 670L476 588C480 582 488 579 496 578L552 572C560 571 566 575 571 581L592 606C576 616 562 632 552 656C548 664 540 668 530 668Z" />
        <path d="M566 664C580 630 598 615 612 612C628 628 660 645 690 660C708 670 718 684 720 698C690 702 650 700 620 690C600 683 580 672 566 664Z" />
        <path d="M650 632C668 622 680 604 694 582C698 578 704 576 710 577L770 588C778 590 783 594 786 600L822 668C800 678 770 688 742 694C734 680 724 666 706 654C688 644 668 638 650 632Z" />
      </g>
      <path
        d="M628 612C600 585 515 525 515 440A115 115 0 1 1 745 440C745 525 656 585 628 612Z"
        fill="#5D6C4B"
        stroke="#fff"
        strokeWidth="14"
        paintOrder="stroke"
      />
      <circle cx="630" cy="445" r="80" fill="#fff" />
      <g fill="#5D6C4B">
        <rect x="578" y="405" width="8" height="48" rx="4" />
        <rect x="596" y="405" width="8" height="48" rx="4" />
        <rect x="614" y="405" width="8" height="48" rx="4" />
        <path d="M578 445H622V455C622 470 616 479 606 482V528H594V482C584 479 578 470 578 455Z" />
        <ellipse cx="663" cy="437" rx="18" ry="30" />
        <rect x="657" y="460" width="12" height="68" rx="5" />
      </g>
      <path
        d="M729 333L746 303M753 357L787 340M764 389L800 393"
        fill="none"
        stroke="#EE8052"
        strokeWidth="13"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ size = "md" }) {
  const large = size === "lg";
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={large ? "size-14" : "size-10"} />
      <span className={`relative font-extrabold tracking-tight text-ink-900 ${large ? "text-3xl" : "text-[22px]"}`}>
        Mappetite
        <svg
          viewBox="0 0 16 12"
          aria-hidden="true"
          className={`absolute ${large ? "-right-2 -top-2 w-5" : "-right-1.5 -top-1.5 w-4"}`}
        >
          <path d="M1 10C3 4 9 1 15 2C13 8 7 12 1 10Z" fill="#5C6B4A" />
        </svg>
      </span>
    </span>
  );
}
