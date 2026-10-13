import { categoryFor } from "@/lib/category";

export default function PlaceThumb({ place, className = "size-20", iconClassName = "size-8" }) {
  const { Icon, bg, fg } = categoryFor(place);
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl ${className}`} style={{ backgroundColor: bg, color: fg }} aria-hidden="true">
      <Icon className={iconClassName} strokeWidth={1.75} />
    </span>
  );
}
