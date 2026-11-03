"use client";

import { Camera, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";

import Modal from "@/components/Modal";
import { useI18n } from "@/lib/i18n";
import { MAX_PHOTOS } from "@/lib/photos";

function Lightbox({ photos, index, onIndex, onClose }) {
  const { t } = useI18n();
  const open = index !== null;
  const count = photos.length;

  useEffect(() => {
    if (!open || count < 2) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "ArrowLeft") onIndex((value) => (value + count - 1) % count);
      else if (event.key === "ArrowRight") onIndex((value) => (value + 1) % count);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, count, onIndex]);

  if (!open) return null;
  const photo = photos[Math.min(index, count - 1)];

  return (
    <Modal open onClose={onClose} title={t("photos.title")} description={t("photos.viewer", { n: index + 1, total: count })} size="lg">
      <div className="relative flex min-h-[40vh] items-center justify-center">
        <img src={photo.url} alt={t("photos.alt", { n: index + 1 })} className="max-h-[65vh] w-full rounded-xl object-contain" />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onIndex((index + count - 1) % count)}
              className="absolute left-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              aria-label={t("photos.prev")}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % count)}
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              aria-label={t("photos.next")}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * Left column of the detail page: the main photo plus a strip of thumbnails. Without uploaded photos
 * it shows `placeholderUrl` and a button to add some (`onAdd`).
 */
export default function PlaceGallery({ place, placeholderUrl, onAdd }) {
  const { t } = useI18n();
  const photos = place.photos || [];
  const [selected, setSelected] = useState(0);
  const [viewer, setViewer] = useState(null); // index of the open lightbox photo, or null

  const active = Math.min(selected, Math.max(photos.length - 1, 0));
  const hasPhotos = photos.length > 0;

  return (
    <>
      <div className="relative min-h-[16rem] flex-1 overflow-hidden rounded-2xl bg-stone-100">
        {hasPhotos ? (
          <button
            type="button"
            onClick={() => setViewer(active)}
            className="absolute inset-0 block size-full cursor-zoom-in"
            aria-label={t("photos.viewer", { n: active + 1, total: photos.length })}
          >
            <img src={photos[active].url} alt={place.name} className="absolute inset-0 h-full w-full object-cover" />
          </button>
        ) : (
          <img
            src={placeholderUrl}
            alt={place.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        {hasPhotos ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {active + 1} / {photos.length}
          </span>
        ) : null}
      </div>

      <div className="shrink-0 rounded-2xl border border-[#EAE5D9] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-ink-900">
            <Camera className="size-3.5 text-ink-500" aria-hidden="true" />
            {t("photos.title")}
            {hasPhotos ? <span className="font-medium text-ink-500">({photos.length}/{MAX_PHOTOS})</span> : null}
          </h3>
          {hasPhotos && photos.length < MAX_PHOTOS ? (
            <button type="button" onClick={onAdd} className="text-[11px] font-bold text-primary-800 hover:underline">
              {t("photos.add")}
            </button>
          ) : null}
        </div>

        {hasPhotos ? (
          <ul className="grid grid-cols-5 gap-1.5">
            {photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-label={t("photos.alt", { n: index + 1 })}
                  aria-current={index === active}
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-stone-100 ring-offset-1 transition-shadow ${
                    index === active ? "ring-2 ring-primary-700" : "hover:ring-2 hover:ring-primary-300"
                  }`}
                >
                  <img src={photo.url} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E5E1D5] px-4 py-6 text-center">
            <p className="text-[12px] text-ink-500">{t("photos.noneYet")}</p>
            <button type="button" onClick={onAdd} className="btn btn-sm btn-outline">
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {t("photos.addFirst")}
            </button>
          </div>
        )}
      </div>

      <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </>
  );
}
