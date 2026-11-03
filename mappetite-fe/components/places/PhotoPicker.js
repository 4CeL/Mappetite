"use client";

import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { compressImage, ImageError } from "@/lib/image";
import { MAX_PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";

let counter = 0;
const newKey = () => `new-${Date.now()}-${(counter += 1)}`;

/**
 * Photo list of the add/edit form. Controlled: `items` and `onChange` come from the form values
 * (see lib/photos.js for the item shapes). Files are compressed on selection but only uploaded when
 * the form is saved, so cancelling the form leaves nothing behind. The first item is the cover.
 */
export default function PhotoPicker({ items, onChange, disabled = false }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState(null);

  // The newest list, also between awaits while several files are being processed
  // (`commit` updates it immediately, this effect keeps it in step with the parent).
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Free the blob: previews of photos that were never saved.
  useEffect(() => {
    const ref = itemsRef;
    return () => {
      ref.current.forEach((item) => item.kind === "new" && URL.revokeObjectURL(item.url));
    };
  }, []);

  const commit = (next) => {
    itemsRef.current = next;
    onChange(next);
  };

  const onPick = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // allow picking the same file again
    if (!files.length) return;

    const room = MAX_PHOTOS - itemsRef.current.length;
    setError(files.length > room ? "photos.limit" : null);

    setBusy(Math.min(files.length, room));
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        const { blob, width, height } = await compressImage(file);
        commit([...itemsRef.current, { key: newKey(), kind: "new", blob, width, height, url: URL.createObjectURL(blob) }]);
      } catch (caught) {
        setError(caught instanceof ImageError ? caught.key : "photos.unreadable");
      }
      setBusy((count) => Math.max(count - 1, 0));
    }
  };

  const remove = (item) => {
    if (item.kind === "new") URL.revokeObjectURL(item.url);
    setError(null);
    commit(itemsRef.current.filter((other) => other.key !== item.key));
  };

  const makeCover = (item) => {
    commit([item, ...itemsRef.current.filter((other) => other.key !== item.key)]);
  };

  const full = items.length + busy >= MAX_PHOTOS;

  return (
    <div>
      <span className="field-label">
        {t("photos.title")}{" "}
        <span className="font-normal text-ink-500">
          ({items.length}/{MAX_PHOTOS})
        </span>
      </span>

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {items.map((item, index) => (
          <li key={item.key} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-stone-100">
            <img src={item.url} alt={t("photos.alt", { n: index + 1 })} className="size-full object-cover" loading="lazy" />
            {index === 0 ? (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                {t("photos.cover")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(item)}
                disabled={disabled}
                className="absolute bottom-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 focus-visible:bg-black/75"
                aria-label={t("photos.makeCover")}
                title={t("photos.makeCover")}
              >
                <Star className="size-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(item)}
              disabled={disabled}
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 focus-visible:bg-black/75"
              aria-label={t("photos.remove")}
              title={t("photos.remove")}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}

        {Array.from({ length: busy }, (_, index) => (
          <li
            key={`busy-${index}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-line bg-stone-100"
            aria-busy="true"
          >
            <Loader2 className="size-5 animate-spin text-ink-500" aria-hidden="true" />
          </li>
        ))}

        {!full ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-[11px] font-semibold text-ink-600 transition-colors hover:border-primary-600 hover:bg-primary-50 hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              {t("photos.add")}
            </button>
          </li>
        ) : null}
      </ul>

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} disabled={disabled || full} />

      {error ? (
        <p className="field-hint font-semibold text-danger-700" role="alert">
          {t(error, { max: MAX_PHOTOS })}
        </p>
      ) : (
        <p className="field-hint">{t("photos.hint", { max: MAX_PHOTOS })}</p>
      )}
    </div>
  );
}
