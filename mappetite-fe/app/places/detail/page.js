"use client";

import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Share2,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import Modal from "@/components/Modal";
import PlaceFields, { bodyFromValues, validateValues, valuesFromPlace } from "@/components/places/PlaceFields";
import { StarRating } from "@/components/places/Rating";
import StatusBadge from "@/components/places/StatusBadge";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { openInMapsUrl } from "@/lib/maps";
import { getFoodPhoto } from "@/lib/food-images";

const PRICE = ["$", "$$", "$$$", "$$$$"];

/* ── Skeleton ─────────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Delete Dialog ───────────────────────────────────────────── */
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

/* ── Info Card wrapper ───────────────────────────────────────── */
function InfoCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[#EAE5D9] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}

/* ── Edit Mode ────────────────────────────────────────────────── */
function EditMode({ editValues, onChange, errors, save, onSave, onCancel, tError, t }) {
  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-6 w-full">
      {save.error ? (
        <div className="alert alert-error" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{tError(save.error)}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#EAE5D9] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <PlaceFields
          values={editValues}
          onChange={onChange}
          errors={errors}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary px-6" disabled={save.status === "saving"}>
          {save.status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t("add.saveChanges")}
        </button>
      </div>
    </form>
  );
}

/* ── Main Detail ─────────────────────────────────────────────── */
function PlaceDetail() {
  const { t, tError, formatDate, formatDistance } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { status, places, upsertPlace, removePlace } = usePlaces();
  const place = places.find((item) => item.id === id) ?? null;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [editValues, setEditValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [save, setSave] = useState({ status: "idle", error: null });
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const counts = useMemo(() => {
    const wishlist = places.filter((p) => p.status === "wishlist").length;
    const visited = places.filter((p) => p.status === "visited").length;
    return { all: places.length, wishlist, visited, priority: 0 };
  }, [places]);

  const onChange = useCallback((patch) => {
    setEditValues((previous) => ({ ...previous, ...patch }));
    setErrors({});
  }, []);

  const onSave = async (event) => {
    event.preventDefault();
    if (!editValues) return;
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

  const startEdit = (overrides = {}) => {
    if (!place) return;
    setEditValues({ ...valuesFromPlace(place), ...overrides });
    setSave({ status: "idle", error: null });
    setNotice(null);
  };

  const cancelEdit = () => {
    setEditValues(null);
    setErrors({});
  };

  const editing = editValues !== null;
  const visited = place?.status === "visited";
  const distance = place ? formatDistance(place.distanceKm) : null;
  const photoUrl = place ? getFoodPhoto(place) : null;

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row">
      <AppSidebar
        counts={counts}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
        className="hidden lg:flex h-screen sticky top-0"
      />

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-[1000] shrink-0 [&>div]:justify-start [&>div]:mx-0 [&_input]:mx-0 [&_form]:mx-0 [&_input]:max-w-md [&_form]:max-w-md"
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {status === "loading" ? (
            <DetailSkeleton />
          ) : !place ? (
            <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center" role="status">
              <p className="text-base font-bold text-ink-900">{t("place.notFound")}</p>
              <Link href="/list/" className="btn btn-outline mt-4">
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t("nav.list")}
              </Link>
            </div>
          ) : (
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[12px] text-ink-500 mb-5">
                <button
                  type="button"
                  onClick={() => (window.history.length > 1 ? router.back() : router.push("/list/"))}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-[#F2EFE8] transition-colors"
                  aria-label={t("place.back")}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <Link href="/list/" className="hover:text-ink-800">
                  Restaurants
                </Link>
                <span className="text-ink-300">›</span>
                <span className="text-ink-800 font-medium truncate">{place.name}</span>
              </nav>

              {notice ? (
                <p className="alert alert-success mb-5" role="status">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {notice}
                </p>
              ) : null}

              {editing ? (
                /* ── Edit Mode ── */
                <div className="flex flex-col gap-6 pl-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-extrabold text-ink-900 leading-tight">
                        {t("place.edit")}
                      </h1>
                      <p className="text-[12px] text-ink-500 mt-0.5">
                        Update the details below, then save.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex size-8 items-center justify-center rounded-full text-ink-500 hover:bg-[#F2EFE8] transition-colors shrink-0"
                      aria-label={t("common.cancel")}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <EditMode
                    editValues={editValues}
                    onChange={onChange}
                    errors={errors}
                    save={save}
                    onSave={onSave}
                    onCancel={cancelEdit}
                    tError={tError}
                    t={t}
                  />
                </div>
              ) : (
                /* ── View Mode ── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* LEFT COLUMN — photo flex-1, photos fixed */}
                  <div className="flex flex-col gap-5">
                    {/* Photo utama — flex-1 biar ngisi sisa tinggi */}
                    <div className="relative flex-1 min-h-[16rem] overflow-hidden rounded-2xl bg-stone-100">
                      <img
                        src={photoUrl}
                        alt={place.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white">
                        1 / 6
                      </span>
                    </div>

                    {/* Photos — shrink-0 biar nggak ketarik */}
                    <div className="shrink-0 rounded-2xl border border-[#EAE5D9] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                      <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-ink-900 mb-3">
                        <Camera className="size-3.5 text-ink-500" />
                        Photos
                      </h3>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="relative aspect-square overflow-hidden rounded-lg bg-stone-100"
                          >
                            {i < 4 ? (
                              <img
                                src={photoUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-stone-200 text-[11px] font-bold text-ink-600">
                                +2
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="flex flex-col gap-5">
                    <InfoCard className="overflow-hidden">
                      {/* Section 1: Title + Info */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h1 className="text-xl font-extrabold text-ink-900 leading-tight">
                            {place.name}
                          </h1>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={place.status} />

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex size-7 items-center justify-center rounded-full text-ink-500 hover:bg-[#F2EFE8] transition-colors"
                                aria-label="More options"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                              >
                                <MoreVertical className="size-4" />
                              </button>

                              {menuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setMenuOpen(false)}
                                  />
                                  <div
                                    role="menu"
                                    className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-[#EAE5D9] bg-white py-1.5 shadow-lg"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setMenuOpen(false);
                                        startEdit();
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-800 hover:bg-[#F5F1E8]"
                                    >
                                      <Pencil className="size-3.5 text-[#9C9485]" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setMenuOpen(false);
                                        setDeleteOpen(true);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#E55A47] hover:bg-[#FDF1EB]"
                                    >
                                      <Trash2 className="size-3.5 text-[#E55A47]" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {place.address && (
                          <div className="flex items-start gap-2 mt-3">
                            <MapPin className="size-4 text-ink-500 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-ink-600 leading-relaxed">{place.address}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {place.tags?.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full bg-[#F4F1EA] border border-[#E5E1D5] px-2.5 py-0.5 text-[11px] font-medium text-ink-700"
                            >
                              {tag.name}
                            </span>
                          ))}
                          {place.price_level && (
                            <span className="rounded-full bg-[#F4F1EA] border border-[#E5E1D5] px-2.5 py-0.5 text-[11px] font-medium text-ink-700">
                              {PRICE[place.price_level - 1]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-[12px] text-ink-600">
                          {distance && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-ink-400" />
                              {distance} away
                            </span>
                          )}
                          {/* {place.opening_hours?.weekday_text?.[0] && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="size-3.5 text-ink-400" />
                              {place.opening_hours.weekday_text[0]}
                            </span>
                          )} */}
                          <span className="flex items-center gap-1 text-[11px] text-ink-500 min-w-0">
                            <Clock className="size-3.5 shrink-0" />
                            <span className="truncate">10.00–23.00</span>
                          </span>
                        </div>

                        {visited && place.rating != null && (
                          <div className="mt-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Star className="size-4 text-[#F59E0B] fill-current" />
                              <span className="text-[12px] font-bold text-ink-700">Your rating</span>
                            </div>
                            <StarRating value={place.rating} size="size-6" showValue />
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-5">
                          <a
                            href={openInMapsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#485635] hover:bg-[#3B472A] text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors"
                          >
                            <MapPin className="size-3.5" />
                            Open in Google Maps
                            <ExternalLink className="size-3" />
                          </a>
                          <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-xl border border-[#E5E1D5] bg-white text-ink-600 hover:bg-[#F2EFE8] transition-colors"
                            aria-label="Save"
                          >
                            <Bookmark className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-xl border border-[#E5E1D5] bg-white text-ink-600 hover:bg-[#F2EFE8] transition-colors"
                            aria-label="Share"
                          >
                            <Share2 className="size-4" />
                          </button>
                        </div>

                        {!visited && (
                          <button
                            type="button"
                            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-visited-500 text-visited-700 hover:bg-visited-50 px-4 py-2.5 text-xs font-bold transition-colors"
                            onClick={() => startEdit({ status: "visited", visited_at: todayISO() })}
                          >
                            <CheckCircle2 className="size-3.5" />
                            {t("place.markVisited")}
                          </button>
                        )}
                      </div>

                      <div className="border-t border-[#EAE5D9]" />

                      {/* Section 2: Notes */}
                      <div className="p-5">
                        <h3 className="text-sm font-extrabold text-ink-900 mb-3">Notes</h3>
                        <div className="rounded-xl bg-[#EDF2E3] px-4 py-3.5">
                          <p className="text-[12px] text-[#5A6348] leading-relaxed whitespace-pre-line">
                            {place.notes || <span className="text-[#9AA58C] italic">{t("place.noNotes")}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#EAE5D9]" />

                      {/* Section 3: Dates */}
                      <div className="p-5">
                        <div className="grid grid-cols-2 gap-4">
                          {visited && place.visited_at && (
                            <div className="flex items-start gap-2.5">
                              <Calendar className="size-[18px] text-[#7A8A5E] shrink-0 mt-0.5" strokeWidth={1.8} />
                              <div>
                                <p className="text-[10px] text-[#9C9485] font-medium">Visited</p>
                                <p className="text-[12px] font-semibold text-ink-800">{formatDate(place.visited_at)}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2.5">
                            <Calendar className="size-[18px] text-[#7A8A5E] shrink-0 mt-0.5" strokeWidth={1.8} />
                            <div>
                              <p className="text-[10px] text-[#9C9485] font-medium">Added</p>
                              <p className="text-[12px] font-semibold text-ink-800">{formatDate(place.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {place.tags?.length > 0 && <div className="border-t border-[#EAE5D9]" />}

                      {/* Section 4: Tags */}
                      {place.tags?.length > 0 && (
                        <div className="p-5">
                          <div className="rounded-xl bg-[#EDF2E3] px-4 py-3.5">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="flex items-center gap-2 text-sm font-bold text-[#5A6348]">
                                <Tag className="size-4 text-[#7A8A5E]" strokeWidth={1.8} />
                                Tags
                              </h3>
                              <ChevronRight className="size-4 text-[#7A8A5E]" />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {place.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded-full bg-white border border-[#DBE3CC] px-3 py-1 text-[11px] font-medium text-[#5A6348]"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </InfoCard>
                  </div>
                </div>
              )}

              <DeleteDialog place={place} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={onDeleted} />
            </div>
          )}
        </div>
      </div>
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