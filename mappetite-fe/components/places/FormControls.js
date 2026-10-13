"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { LIMITS } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

/** Wishlist / visited segmented control. */
export function StatusToggle({ value, onChange }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="field-label">{t("status.label")}</legend>
      <div className="segmented">
        {["wishlist", "visited"].map((status) => (
          <button key={status} type="button" aria-pressed={value === status} onClick={() => onChange(status)}>
            {t(`status.${status}Long`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** $ – $$$$, click the active one again to clear. */
export function PriceSelector({ value, onChange }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="field-label">{t("add.price")}</legend>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={value === level}
            onClick={() => onChange(value === level ? null : level)}
            className={`min-h-11 rounded-xl border text-sm transition-colors ${
              value === level
                ? "border-primary-700 bg-primary-50 font-bold text-primary-800"
                : "border-line bg-white text-ink-600 hover:bg-chip"
            }`}
          >
            {"$".repeat(level)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Tag chips + free-text input + suggestions from the user's existing tags. */
export function TagInput({ value, onChange, suggestions = [] }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const full = value.length >= LIMITS.tagsPerPlace;

  const add = (raw) => {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, LIMITS.tag);
    if (!name || full || value.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  };

  const remove = (name) => onChange(value.filter((tag) => tag !== name));

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const needle = draft.trim().toLowerCase();
  const available = suggestions
    .filter((name) => !value.some((tag) => tag.toLowerCase() === name.toLowerCase()))
    .filter((name) => !needle || name.toLowerCase().includes(needle))
    .slice(0, 6);

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {t("add.tags")}
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-2 py-1.5 focus-within:border-primary-700 focus-within:ring-3 focus-within:ring-primary-700/15">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-chip py-1 pl-3 pr-1 text-xs font-medium text-ink-700">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="flex size-5 items-center justify-center rounded-full hover:bg-line"
              aria-label={t("add.removeTag", { name: tag })}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={full ? t("add.tagLimit", { max: LIMITS.tagsPerPlace }) : t("add.tagPlaceholder")}
          disabled={full}
          maxLength={LIMITS.tag}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-500"
          enterKeyHint="done"
        />
      </div>
      {available.length > 0 && !full ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-500">{t("add.tagSuggestions")}:</span>
          {available.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-ink-600 hover:bg-chip"
            >
              <Plus className="size-3" aria-hidden="true" />
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
