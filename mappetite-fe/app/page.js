"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Edit2,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import { MapView } from "@/components/map";
import EmptyState from "@/components/places/EmptyState";
import PlaceThumb from "@/components/places/PlaceThumb";
import { PlaceCardSkeleton } from "@/components/places/PlaceCard";
import StatusBadge from "@/components/places/StatusBadge";
import { RatingPill } from "@/components/places/Rating";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { sortPlaces } from "@/lib/filters";
import { shortArea } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { getFoodPhoto } from "@/lib/food-images";
import { openInMapsUrl, directionsUrl } from "@/lib/maps";
import { api } from "@/lib/api";

/* ── Greeting helper ─────────────────────────────────────────────── */
function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.goodMorning");
  if (hour < 15) return t("home.goodAfternoon");
  if (hour < 18) return t("home.goodEvening");
  return t("home.goodNight");
}

/* ── Stats Row (compact, interactive filter) ─────────────────────── */
function StatsRow({ counts, activeStatus = "all", onSelectStatus }) {
  const { t } = useI18n();
  const items = [
    {
      id: "wishlist",
      icon: Bookmark,
      color: "#D96B43",
      bg: "#FCE8DE",
      activeBg: "bg-[#FDF1EB] border-[#FADCD0] ring-2 ring-[#D96B43]/20 shadow-xs",
      label: t("status.wishlistLong"),
      value: counts.wishlist,
    },
    {
      id: "visited",
      icon: Check,
      color: "#4E8746",
      bg: "#E0EEDD",
      activeBg: "bg-[#EDF4EB] border-[#DCEDD9] ring-2 ring-[#4E8746]/20 shadow-xs",
      label: t("status.visitedLong"),
      value: counts.visited,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-2.5">
      {items.map((item) => {
        const isActive = activeStatus === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectStatus?.(isActive ? "all" : item.id)}
            className={`group flex flex-col items-center gap-1 min-w-0 flex-1 py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
              isActive
                ? `${item.activeBg} font-bold`
                : "border-[#ECE7DD] bg-white hover:bg-[#FAF8F3] hover:border-[#DED8CB]"
            }`}
            aria-pressed={isActive}
            aria-label={`${item.label} (${item.value})`}
          >
            <span
              className={`flex size-7 items-center justify-center rounded-full transition-transform ${
                isActive ? "scale-110 shadow-xs" : "group-hover:scale-105"
              }`}
              style={{ backgroundColor: item.bg }}
            >
              <item.icon className="size-3.5" style={{ color: item.color }} strokeWidth={2.5} />
            </span>
            <span className="text-base font-extrabold text-ink-900 leading-none">{item.value}</span>
            <span
              className={`text-[10.5px] truncate transition-colors ${
                isActive ? "font-bold text-ink-900" : "font-medium text-ink-500 group-hover:text-ink-700"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Compact Restaurant Card (left panel list) ───────────────────── */
function NearbyCard({ place, selected, onSelect }) {
  const { formatDistance } = useI18n();
  const [imgError, setImgError] = useState(false);
  const photoUrl = getFoodPhoto(place);
  const area = shortArea(place.address);
  const distance = formatDistance(place.distanceKm);
  const firstTag = place.tags?.[0]?.name;

  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      className={`group/card flex items-center gap-3 w-full rounded-xl p-2.5 text-left transition-all hover:bg-[#F2EFE8] ${
        selected ? "bg-[#E5EBDD] ring-1 ring-[#C5D4B8]" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {!imgError ? (
          <img
            src={photoUrl}
            alt={place.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <PlaceThumb place={place} className="size-full rounded-none" iconClassName="size-8" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 justify-between">
          <span className="text-sm font-bold text-ink-900 truncate">{place.name}</span>
          <StatusBadge status={place.status} className="shrink-0 text-[10px] px-2 py-0.5" />
        </div>
        <p className="text-[11px] text-ink-500 truncate mt-0.5">
          {[firstTag, distance].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-1 mt-1">
          {place.rating != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-ink-700">
              <Star className="size-3 text-[#F59E0B] fill-current" />
              {Number(place.rating).toFixed(1)}
              {place.google_maps_rating_count != null && (
                <span className="font-normal text-ink-400">({place.google_maps_rating_count.toLocaleString()})</span>
              )}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-ink-300 group-hover/card:text-ink-500 transition-colors" />
    </button>
  );
}

/* ── Right Detail Panel ──────────────────────────────────────────── */
function DetailPanel({ place, onClose, onDelete }) {
  const { lang, t, formatDistance } = useI18n();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const photoUrl = getFoodPhoto(place);
  const firstTag = place.tags?.[0]?.name;
  const distance = formatDistance(place.distanceKm);

  const handleShare = async () => {
    const shareData = {
      title: place.name ?? "Restaurant",
      text: `Cek tempat ini: ${place.name ?? ""}`,
      url: openInMapsUrl(place),
    };

    // Coba pakai Web Share API (native)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // user cancel atau error, fallback ke clipboard
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: copy ke clipboard
    try {
      await navigator.clipboard.writeText(shareData.url);
      // opsional: tampilkan toast "Link copied!"
    } catch {
      // fallback terakhir: prompt manual
      window.prompt("Copy link ini:", shareData.url);
    }
  };

  const actionButtons = [
    { icon: Bookmark, label: t("common.save") },
    { icon: Navigation, label: t("place.openInMaps"), href: openInMapsUrl(place) },
    { icon: Share2, label: t("place.more"), onClick: handleShare },
  ];

  return (
    <aside className="flex flex-col w-full h-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#EAE5D9] overflow-hidden">
      {/* ── Photo Header ── */}
      <div className="relative h-40 shrink-0 overflow-hidden bg-stone-100">
        {!imgError ? (
          <img
            src={photoUrl}
            alt={place.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceThumb place={place} className="h-full w-full rounded-none" iconClassName="size-10" />
        )}

        {/* Gradient overlay biar tombol kebaca */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* Top controls — overlay di atas gambar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-end p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-ink-700 hover:bg-white shadow-sm transition-colors"
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Content (scrollable) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
          {/* Name + Status */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-extrabold text-ink-900 leading-tight">{place.name}</h2>
              <StatusBadge status={place.status} className="shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-ink-500 mt-1.5">
              {[firstTag, distance].filter(Boolean).join(" · ")}
            </p>
            {place.rating != null && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star className="size-3.5 text-[#F59E0B] fill-current" />
                <span className="text-sm font-bold text-ink-800">{Number(place.rating).toFixed(1)}</span>
                {place.google_maps_rating_count != null && (
                  <span className="text-xs text-ink-400">({place.google_maps_rating_count.toLocaleString()})</span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between gap-2">
            {actionButtons.map((btn) => {
              const Comp = btn.href ? "a" : "button";
              const extraProps = btn.href
                ? { href: btn.href, target: "_blank", rel: "noopener noreferrer" }
                : { type: "button", onClick: btn.onClick };
              return (
                <Comp
                  key={btn.label}
                  {...extraProps}
                  className="flex flex-col items-center gap-1.5 flex-1 rounded-xl py-3 text-ink-600 hover:bg-[#F2EFE8] transition-colors"
                >
                  <btn.icon className="size-5" />
                  <span className="text-[10px] font-medium">{btn.label}</span>
                </Comp>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE5D9]" />

          {/* Address */}
          {place.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
              <p className="text-xs text-ink-700 leading-relaxed">{place.address}</p>
            </div>
          )}

          {/* Status Dropdown */}
          <div>
            <h3 className="text-xs font-bold text-ink-800 mb-2">{t("detail.visitStatus")}</h3>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border ${
              place.status === "visited"
                ? "border-[#DBEBD7] bg-[#EDF4EB] text-[#4E8746]"
                : "border-[#FCDFD3] bg-[#FDF1EB] text-[#D96B43]"
            }`}>
              {place.status === "visited" ? (
                <Check className="size-3.5 stroke-[2.5]" />
              ) : (
                <Bookmark className="size-3.5 fill-current" />
              )}
              <span>{place.status === "visited" ? t("status.visitedLong") : t("status.wishlistLong")}</span>
            </div>
          </div>

          {/* Tags */}
          {place.tags?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-800 mb-2">{t("filters.tags")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-[#F4F1EA] border border-[#E5E1D5] px-3 py-1 text-[11px] font-medium text-ink-700"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section — tanpa tombol Edit */}
          {place.notes && (
            <div>
              <h3 className="text-xs font-bold text-ink-800 mb-2 flex items-center gap-1.5">
                <span>📝</span> {t("place.notes")}
              </h3>
              <div className="rounded-xl bg-white border border-[#ECE7DD] p-3">
                <p className="text-xs text-ink-600 leading-relaxed whitespace-pre-wrap">{place.notes}</p>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/places/detail/?id=${encodeURIComponent(place.id)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#485635] hover:bg-[#3B472A] text-white px-4 py-3 text-xs font-bold shadow-sm transition-all"
            >
              <Edit2 className="size-4" /> {t("place.detailShort")}
            </Link>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(place)}
                className="flex size-11 items-center justify-center rounded-xl border border-danger-200 bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                aria-label={t("common.delete")}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Bottom CTA Banner (compact bar) ─────────────────────────────── */
function BottomCTA({ onAdd }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#ECE7DD] bg-white px-2.5 py-2 shadow-sm">
      <span className="flex size-7 items-center justify-center rounded-full bg-[#E5EBDD] shrink-0">
        <MapPin className="size-3.5 text-[#485635]" />
      </span>
      <p className="flex-1 min-w-0 text-[11px] font-semibold text-ink-700 truncate">
        {t("home.bottomCtaSubtitle")}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#D96B43] hover:bg-[#C45A35] text-white px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-colors"
      >
        <Plus className="size-3 stroke-[2.5]" />
        {t("nav.add")}
      </button>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function HomePage() {
  const { lang, t, formatDistance } = useI18n();
  const { user } = useAuth();
  const {
    status,
    places,
    reload,
    selectedId,
    setSelectedId,
    geo,
    locate,
    openAdd,
    removePlace,
  } = usePlaces();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [panelOpen, setPanelOpen] = useState(true); // toggle untuk panel kiri

  // Counts
  const counts = useMemo(() => {
    const wishlist = places.filter((p) => p.status === "wishlist").length;
    const visited = places.filter((p) => p.status === "visited").length;
    return { all: places.length, wishlist, visited, priority: 0 };
  }, [places]);

  // Filtered + sorted places
  const visiblePlaces = useMemo(() => {
    let result = [...places];

    if (activeStatus === "wishlist") result = result.filter((p) => p.status === "wishlist");
    else if (activeStatus === "visited") result = result.filter((p) => p.status === "visited");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        return (
          p.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          p.tags?.some((tag) => tag.name.toLowerCase().includes(q))
        );
      });
    }

    return sortPlaces(result, "nearest");
  }, [places, activeStatus, searchQuery]);

  const selectedPlace = selectedId
    ? visiblePlaces.find((p) => p.id === selectedId) ?? null
    : null;

  const onSelect = useCallback((id) => setSelectedId(id), [setSelectedId]);
  const renderPopup = useCallback(
    (place) => null, // We don't use map popups anymore, using the right panel instead
    [],
  );

  // Scroll the list card into view when a marker is clicked
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`nearby-card-${selectedId}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  const handleDeletePlace = async (place) => {
    if (window.confirm(t("detail.deleteConfirm", { name: place.name }))) {
      try {
        await api.deletePlace(place.id);
        removePlace(place.id);
      } catch {
        alert(t("detail.deleteFailed"));
      }
    }
  };

  const displayName = user?.username || "Stefanus";

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row">
      {/* 1. Left Sidebar (matches list page) */}
      <AppSidebar
        counts={counts}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
        className="hidden lg:flex h-screen sticky top-0"
      />

      {/* 2. Main Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Top Navbar (same as list page) — search bar nempel ke kiri */}
        <TopSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-[1050] shrink-0"
        />

        {/* Content: Map as background + floating panels */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* Map — full area background */}
          <div className="absolute inset-0">
            <MapView
              places={visiblePlaces}
              selectedId={selectedPlace?.id ?? null}
              onSelect={onSelect}
              geo={geo}
              onLocate={locate}
              renderPopup={renderPopup}
              controlsClassName={`bottom-6 right-6 w-fit ${
                selectedPlace ? "xl:right-[22rem]" : ""
              }`}
              attributionOffset="0px"
            />
          </div>

          {/* Toggle Button — floating di KIRI ATAS map */}
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="hidden lg:flex absolute top-4 left-4 z-[950] items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#EAE5D9] shadow-lg px-3 py-2 text-xs font-bold text-ink-800 hover:bg-white transition-colors"
            aria-label={panelOpen ? t("home.hidePanel") : t("home.showPanel")}
          >
            {panelOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
            <span>{panelOpen ? t("home.hidePanel") : t("home.showPanel")}</span>
          </button>

          {/* Left Floating Panel (Desktop) */}
          {panelOpen && (
            <div className="hidden lg:flex flex-col absolute top-16 left-4 bottom-4 w-[22rem] z-[900] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#EAE5D9] overflow-hidden">
              {/* Greeting Card (compact) */}
              <div className="px-4 pt-4 pb-3">
                <div className="rounded-xl border border-[#ECE7DD] bg-white px-3 py-3 shadow-sm">
                  <p className="text-[13px] text-ink-700 leading-tight">
                    <span className="text-sm">🌿</span>{" "}
                    <span className="font-bold text-ink-900">{getGreeting(t)}, {displayName}!</span>{" "}
                    <span className="text-[12px]">🌟</span>
                  </p>
                  <p className="text-[10.5px] text-ink-500 mt-0.5 leading-snug">
                    {t("home.nearbySubtitle")}
                  </p>
                  <div className="mt-3">
                    <StatsRow counts={counts} activeStatus={activeStatus} onSelectStatus={setActiveStatus} />
                  </div>
                </div>
              </div>

              {/* Nearby Restaurants */}
              <div className="px-4 flex items-center justify-between mb-2">
                <h2 className="text-sm font-extrabold text-ink-900">{t("home.nearbyTitle")}</h2>
                <Link
                  href="/list/"
                  className="text-[11px] font-bold text-primary-700 hover:underline flex items-center gap-0.5"
                >
                  {t("home.viewAll")} <ChevronRight className="size-3" />
                </Link>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                {status === "loading" ? (
                  <div className="flex flex-col gap-2 px-2">
                    {[0, 1, 2, 3].map((k) => (
                      <PlaceCardSkeleton key={k} compact />
                    ))}
                  </div>
                ) : status === "error" ? (
                  <div className="px-2">
                    <EmptyState kind="error" onRetry={reload} />
                  </div>
                ) : visiblePlaces.length === 0 ? (
                  <div className="px-2">
                    <EmptyState kind="empty" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {visiblePlaces.map((place) => (
                      <div key={place.id} id={`nearby-card-${place.id}`}>
                        <NearbyCard
                          place={place}
                          selected={place.id === selectedId}
                          onSelect={onSelect}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom CTA (compact) */}
              <div className="px-3 pb-3 pt-1 shrink-0">
                <BottomCTA onAdd={openAdd} />
              </div>
            </div>
          )}

          {/* Right Floating Detail Panel (Desktop, shown when a place is selected) */}
          {selectedPlace && (
            <div className="hidden xl:block absolute top-4 right-4 bottom-4 w-80 z-[900]">
              <DetailPanel
                place={selectedPlace}
                onClose={() => setSelectedId(null)}
                onDelete={handleDeletePlace}
              />
            </div>
          )}

          {/* Mobile Bottom Sheet */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 z-[950]">
            <MobileBottomSheet
              places={visiblePlaces}
              selected={selectedPlace}
              counts={counts}
              status={status}
              onSelect={onSelect}
              onClose={() => setSelectedId(null)}
              onAdd={openAdd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Bottom Sheet ─────────────────────────────────────────── */
function MobileBottomSheet({ places, selected, counts, status, onSelect, onClose, onAdd }) {
  const { t, formatDistance } = useI18n();

  if (selected) {
    return (
      <div className="rounded-t-3xl bg-white px-5 pb-5 pt-3 shadow-sheet">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <div className="flex items-center gap-4" aria-live="polite">
          <PlaceThumb place={selected} className="size-[4.5rem]" iconClassName="size-8" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-ink-900">{selected.name}</h2>
            <p className="truncate text-xs text-ink-500">
              {[shortArea(selected.address), formatDistance(selected.distanceKm)].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <RatingPill value={selected.rating} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-8 rounded-full flex items-center justify-center text-ink-500 hover:bg-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link
            href={`/places/detail/?id=${encodeURIComponent(selected.id)}`}
            className="btn btn-outline btn-sm"
          >
            {t("place.detail")}
          </Link>
          <a
            href={directionsUrl(selected)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            {t("place.directions")}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-t-3xl bg-white px-5 pb-5 pt-3 shadow-sheet">
      <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MapPin className="size-4 text-primary-700" aria-hidden="true" />
          {status === "loading" ? t("app.loading") : t("home.restaurantsShown", { count: places.length })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="btn btn-sm btn-primary"
          >
            <Plus className="size-3.5" />
            {t("nav.add")}
          </button>
          <Link href="/list/" className="btn btn-sm btn-outline">
            {t("nav.list")}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}