"use client";

import {
  Bookmark,
  Calendar,
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
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import Modal from "@/components/Modal";
import OpeningHours from "@/components/places/OpeningHours";
import PlaceGallery from "@/components/places/PlaceGallery";
import { StarRating } from "@/components/places/Rating";
import StatusBadge from "@/components/places/StatusBadge";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { hasHours } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import { openInMapsUrl } from "@/lib/maps";
import { getFoodPhoto } from "@/lib/food-images";


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

/* ── Main Detail ─────────────────────────────────────────────── */
function PlaceDetail() {
  const { t, tError, formatDate, formatDistance } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { status, places, removePlace, openEdit } = usePlaces();
  const place = places.find((item) => item.id === id) ?? null;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const counts = useMemo(() => {
    const wishlist = places.filter((p) => p.status === "wishlist").length;
    const visited = places.filter((p) => p.status === "visited").length;
    return { all: places.length, wishlist, visited, priority: 0 };
  }, [places]);

  const onDeleted = () => {
    removePlace(place.id);
    router.push("/list/");
  };

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
          className="border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-[1050] shrink-0"
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


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* LEFT COLUMN — photo flex-1, photos fixed */}
                <div className="flex flex-col gap-5">
                  <PlaceGallery place={place} placeholderUrl={photoUrl} onAdd={() => openEdit(place.id)} />
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
                                      openEdit(place.id);
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
                            {t(`price.${place.price_level}`)}
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
                        {hasHours(place) ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Clock className="size-3.5 shrink-0 text-ink-400" />
                            <OpeningHours place={place} />
                          </span>
                        ) : null}
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
                          onClick={() => openEdit(place.id, { status: "visited", visited_at: todayISO() })}
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
