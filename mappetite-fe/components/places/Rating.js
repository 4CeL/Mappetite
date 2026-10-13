"use client";

import { Star } from "lucide-react";
import { useId } from "react";

import { useI18n } from "@/lib/i18n";

function StarGlyph({ fill, className }) {
  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <Star className="absolute inset-0 size-full text-line-strong" fill="currentColor" strokeWidth={0} />
      {fill > 0 ? (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Star className={`${className} text-star`} fill="currentColor" strokeWidth={0} />
        </span>
      ) : null}
    </span>
  );
}

const fillFor = (value, index) => Math.min(1, Math.max(0, (value ?? 0) - index));

/** Read-only star display with half stars. */
export function StarRating({ value, size = "size-4", showValue = false, className = "" }) {
  const { t, formatNumber } = useI18n();
  const label = t("rating.star", { value: formatNumber(value ?? 0, 1) });
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={label}>
      <span className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <StarGlyph key={index} fill={fillFor(value, index)} className={size} />
        ))}
      </span>
      {showValue ? <span className="ml-1 text-base font-bold text-ink-900">{formatNumber(value ?? 0, 1)}</span> : null}
    </span>
  );
}

/** Compact "★ 4,5" used on cards. */
export function RatingPill({ value }) {
  const { t, formatNumber } = useI18n();
  if (value == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-900">
      <Star className="size-3.5 text-star" fill="currentColor" strokeWidth={0} aria-hidden="true" />
      <span className="sr-only">{t("rating.star", { value: formatNumber(value, 1) })}</span>
      <span aria-hidden="true">{formatNumber(value, 1)}</span>
    </span>
  );
}

/**
 * Rating input with half steps (0.5–5). Native radio buttons give one tab stop
 * and arrow-key navigation; each star has a left (x.5) and right (x.0) half.
 */
export function RatingInput({ value, onChange, label }) {
  const { t, formatNumber } = useI18n();
  const name = useId();

  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className="relative size-9 rounded-md has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-primary-700"
          >
            <StarGlyph fill={fillFor(value, star - 1)} className="size-9" />
            {[star - 0.5, star].map((option, half) => (
              <label key={option} className={`absolute inset-y-0 ${half === 0 ? "left-0" : "right-0"} w-1/2 cursor-pointer`}>
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />
                <span className="sr-only">{t("rating.star", { value: formatNumber(option, 1) })}</span>
              </label>
            ))}
          </span>
        ))}
        <span className="ml-2 min-w-8 text-sm font-bold text-ink-900">{value ? formatNumber(value, 1) : t("rating.none")}</span>
        {value ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>
            {t("rating.clear")}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
