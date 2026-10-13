"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import Modal from "@/components/Modal";
import { LocationPicker } from "@/components/map";
import PlaceFields, { bodyFromValues, validateValues, valuesFromPlace } from "@/components/places/PlaceFields";
import { StarRating } from "@/components/places/Rating";
import StatusBadge from "@/components/places/StatusBadge";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, openInMapsUrl } from "@/lib/maps";

const PRICE = ["$", "$$", "$$$", "$$$$"];

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl lg:px-6 lg:py-8" aria-busy="true">
      <div className="skeleton h-64 rounded-none lg:rounded-3xl" />
      <div className="flex flex-col gap-3 px-5 py-6">
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    </div>
  );
}

function DeleteDialog({ place, open, onClose, onDeleted }) {
  const { t, tError } = useI18n();
  const [state, setState] = useState({ status: "idle", error: null });

  const onConfirm = async () => {
    setState({ status: "deleting", error: null });
    try {
      await api.deletePlace(place.id);
      onDeleted();
    } catch (error) {
      setState({ status: "error", error });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("place.deleteConfirmTitle")}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={state.status === "deleting"}>
            {state.status === "deleting" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {t("common.delete")}
          </button>
        </div>
      }
    >
      <p className="text-sm text-ink-700">{t("place.deleteConfirmBody", { name: place.name })}</p>
      {state.error ? (
        <p className="mt-3 text-sm text-danger-700" role="alert">
          {tError(state.error)}
        </p>
      ) : null}
    </Modal>
  );
}

function PlaceDetail() {
  const { t, tError, formatDate, formatDistance } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { status, places, upsertPlace, removePlace } = usePlaces();
  const place = places.find((item) => item.id === id) ?? null;

  const [editValues, setEditValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [save, setSave] = useState({ status: "idle", error: null });
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onChange = useCallback((patch) => {
    setEditValues((previous) => ({ ...previous, ...patch }));
    setErrors({});
  }, []);

  if (status === "loading") return <DetailSkeleton />;
  if (!place) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center" role="status">
        <p className="text-base font-bold text-ink-900">{t("place.notFound")}</p>
        <Link href="/list/" className="btn btn-outline mt-4">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t("nav.list")}
        </Link>
      </div>
    );
  }

  const editing = editValues !== null;
  const startEdit = (overrides = {}) => {
    setEditValues({ ...valuesFromPlace(place), ...overrides });
    setSave({ status: "idle", error: null });
    setNotice(null);
  };
  const cancelEdit = () => {
    setEditValues(null);
    setErrors({});
  };

  const onSave = async (event) => {
    event.preventDefault();
    const found = validateValues(editValues);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSave({ status: "saving", error: null });
    try {
      const updated = await api.updatePlace(place.id, bodyFromValues(editValues));
      upsertPlace(updated);
      setEditValues(null);
      setSave({ status: "idle", error: null });
      setNotice(t("place.saved"));
    } catch (error) {
      setSave({ status: "error", error });
    }
  };

  const onDeleted = () => {
    removePlace(place.id);
    router.push("/list/");
  };

  const visited = place.status === "visited";
  const distance = formatDistance(place.distanceKm);

  return (
    <div className="mx-auto max-w-3xl lg:px-6 lg:py-8">
      <div className="relative h-64 overflow-hidden lg:h-72 lg:rounded-t-3xl">
        <LocationPicker
          readOnly
          value={editing ? editValues.location : { latitude: place.latitude, longitude: place.longitude }}
          status={editing ? editValues.status : place.status}
          label={place.name}
        />
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/list/"))}
          className="icon-btn absolute left-4 top-4 z-[900]"
          aria-label={t("place.back")}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      </div>

      <article className="relative z-[901] -mt-6 rounded-t-3xl bg-white px-5 pb-36 pt-6 sm:px-8 lg:mt-0 lg:rounded-none lg:rounded-b-3xl lg:pb-8 lg:shadow-card">
        {notice ? (
          <p className="alert alert-success mb-5" role="status">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        ) : null}

        {editing ? (
          <form onSubmit={onSave} noValidate className="flex flex-col gap-5">
            <h1 className="text-xl font-bold text-ink-900">{t("place.edit")}</h1>
            <PlaceFields values={editValues} onChange={onChange} errors={errors} />
            {save.error ? (
              <div className="alert alert-error" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{tError(save.error)}</p>
              </div>
            ) : null}
            <div className="sticky bottom-[4.5rem] -mx-5 flex justify-end gap-3 border-t border-line bg-white px-5 py-4 sm:-mx-8 sm:px-8 lg:bottom-0">
              <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                {t("common.cancel")}
              </button>
              <button type="submit" className="btn btn-primary px-6" disabled={save.status === "saving"}>
                {save.status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t("add.saveChanges")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold leading-tight text-ink-900">{place.name}</h1>
                {place.address ? <p className="mt-1.5 text-[13px] text-ink-500">{place.address}</p> : null}
                {distance ? <p className="text-[13px] text-ink-500">{t("place.distance", { distance })}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-danger-700 hover:bg-danger-50"
                aria-label={t("place.delete")}
              >
                <Trash2 className="size-[18px]" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={place.status} long className="py-1.5" />
              {place.price_level ? <span className="tag py-1 text-xs">{PRICE[place.price_level - 1]}</span> : null}
              {place.tags.map((tag) => (
                <span key={tag.id} className="tag py-1 text-xs">
                  {tag.name}
                </span>
              ))}
            </div>

            <hr className="my-6 border-line" />

            {visited ? (
              <section className="mb-6">
                <h2 className="mb-2 text-[13px] font-bold text-ink-700">{t("place.yourRating")}</h2>
                {place.rating != null ? (
                  <StarRating value={place.rating} size="size-7" showValue />
                ) : (
                  <p className="text-sm text-ink-500">{t("place.notRated")}</p>
                )}
              </section>
            ) : (
              <button
                type="button"
                className="btn btn-outline mb-6 w-full border-visited-500 text-visited-700 hover:bg-visited-50 sm:w-auto"
                onClick={() => startEdit({ status: "visited", visited_at: todayISO() })}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {t("place.markVisited")}
              </button>
            )}

            <section>
              <h2 className="mb-2 text-[13px] font-bold text-ink-700">{t("place.notes")}</h2>
              <p className="whitespace-pre-line rounded-xl border border-line bg-cream/60 px-4 py-3 text-[13px] text-ink-700">
                {place.notes || <span className="text-ink-500">{t("place.noNotes")}</span>}
              </p>
            </section>

            <dl className="mt-6 grid grid-cols-2 gap-4">
              {visited && place.visited_at ? (
                <div>
                  <dt className="text-xs text-ink-500">{t("place.visitedOn")}</dt>
                  <dd className="text-sm font-bold text-ink-900">{formatDate(place.visited_at)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-ink-500">{t("place.addedOn")}</dt>
                <dd className="text-sm font-bold text-ink-900">{formatDate(place.created_at)}</dd>
              </div>
            </dl>

            <a
              href={openInMapsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-800 hover:underline"
            >
              {t("place.openInMaps")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>

            <div className="fixed inset-x-0 bottom-[4.5rem] z-[950] flex gap-3 border-t border-line bg-white px-5 py-3 lg:static lg:mt-8 lg:border-0 lg:p-0">
              <button type="button" className="btn btn-outline flex-1 lg:flex-none" onClick={() => startEdit()}>
                <Pencil className="size-4" aria-hidden="true" />
                {t("place.edit")}
              </button>
              <a
                href={directionsUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex-[2] lg:flex-none"
              >
                {t("place.directionsLong")}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          </>
        )}
      </article>

      <DeleteDialog place={place} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={onDeleted} />
    </div>
  );
}

export default function PlaceDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PlaceDetail />
    </Suspense>
  );
}
