﻿"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Share2,
  Star,
  Trash2,
  X,
  Wallet,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import { MapView } from "@/components/map";
import MobilePlaceSheets from "@/components/places/MobilePlaceSheets";
import EmptyState from "@/components/places/EmptyState";
import PlaceThumb from "@/components/places/PlaceThumb";
import { PlaceCardSkeleton } from "@/components/places/PlaceCard";
import StatusBadge from "@/components/places/StatusBadge";
import OpeningHours from "@/components/places/OpeningHours";
import { RatingPill, StarRating } from "@/components/places/Rating";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { sortPlaces } from "@/lib/filters";
import { shortArea } from "@/lib/format";
import { hasHours } from "@/lib/hours";
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

/* ── Stats Row ───────────────────────────────────────────────────── */
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

/* ── Right Detail Panel (Desktop) ────────────────────────────────── */
function DetailPanel({ place, onClose, onDelete }) {
  const { lang, t, formatDistance, formatNumber, formatDate } = useI18n();
  const { openEdit } = usePlaces();
  const [imgError, setImgError] = useState(false);
  const photoUrl = getFoodPhoto(place);
  const firstTag = place.tags?.[0]?.name;
  const distance = formatDistance(place.distanceKm);

  const handleShare = async () => {
    const shareData = {
      title: place.name ?? "Restaurant",
      text: `Cek tempat ini: ${place.name ?? ""}`,
      url: openInMapsUrl(place),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
    } catch {
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
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-end p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-ink-700 hover:bg-white shadow-sm transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-extrabold text-ink-900 leading-tight">{place.name}</h2>
              <StatusBadge status={place.status} className="shrink-0 mt-0.5" />
            </div>
            
            {(place.rating != null || place.price_level) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs">
                {place.rating != null && (
                  <span className="flex items-center gap-1">
                    <span className="text-sm font-bold text-ink-800">{formatNumber(place.rating, 1)}</span>
                    <StarRating value={place.rating} size="size-3" />
                  </span>
                )}
                {place.rating != null && place.price_level ? <span className="text-ink-300">·</span> : null}
                {place.price_level ? (
                  <span className="font-semibold text-ink-700">{t(`price.${place.price_level}`)}</span>
                ) : null}
              </div>
            )}

            <p className="text-xs text-ink-500 mt-1">
              {[firstTag, distance].filter(Boolean).join(" · ")}
            </p>
          </div>

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

          <div className="border-t border-[#EAE5D9]" />

          {place.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
              <p className="text-xs text-ink-700 leading-relaxed">{place.address}</p>
            </div>
          )}

          {hasHours(place) ? (
            <div className="flex items-start gap-2.5">
              <Clock className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
              <OpeningHours place={place} className="text-xs" />
            </div>
          ) : null}

          {place.price_level ? (
            <div className="flex items-start gap-2.5">
              <Wallet className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-ink-800">
                {t("price.perPerson", { price: t(`price.full.${place.price_level}`) })}
              </p>
            </div>
          ) : null}

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

          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/places/detail/?id=${encodeURIComponent(place.id)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#485635] hover:bg-[#3B472A] text-white px-4 py-3 text-xs font-bold shadow-sm transition-all"
            >
              <ArrowRight className="size-4" /> {t("place.detailShort")}
            </Link>
            <button
              type="button"
              onClick={() => openEdit(place.id)}
              className="flex size-11 items-center justify-center rounded-xl border border-[#EAE5D9] bg-white text-ink-700 hover:bg-[#F2EFE8] transition-colors"
              aria-label={t("place.edit")}
              title={t("place.edit")}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(place)}
                className="flex size-11 items-center justify-center rounded-xl border border-danger-200 bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
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

/* ── Bottom CTA Banner (Desktop Panel) ───────────────────────────── */
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
  const [panelOpen, setPanelOpen] = useState(true);
  // How much of the map the phone sheet covers (px); the map keeps the selected restaurant above it.
  const [sheetVisible, setSheetVisible] = useState(0);

  const counts = useMemo(() => {
    const wishlist = places.filter((p) => p.status === "wishlist").length;
    const visited = places.filter((p) => p.status === "visited").length;
    return { all: places.length, wishlist, visited, priority: 0 };
  }, [places]);

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
  const renderPopup = useCallback((place) => null, []);

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
    // Tambahkan overflow-x-hidden di container utama
    <div className="fixed inset-x-0 top-0 bottom-[var(--mp-tabbar-h)] lg:bottom-0 w-full bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row overflow-hidden">
      
      <AppSidebar
        counts={counts}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
        className="hidden lg:flex h-full sticky top-0 shrink-0 z-20"
      />

      <div className="flex-1 min-w-0 flex flex-col h-full relative overflow-hidden">
        <TopSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="hidden lg:flex border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-[1050] shrink-0"
        />

        <div className="flex-1 min-h-0 relative overflow-hidden bg-stone-200">
          
          <div className="absolute inset-0 z-0">
            <MapView
              places={visiblePlaces}
              selectedId={selectedPlace?.id ?? null}
              onSelect={onSelect}
              geo={geo}
              onLocate={locate}
              renderPopup={renderPopup}
              controlsClassName={`max-lg:bottom-[calc(var(--mp-sheet-visible,5rem)_+_0.75rem)] right-4 w-fit lg:bottom-6 lg:right-6 ${
                selectedPlace ? "xl:right-[22rem]" : ""
              }`}
              attributionOffset="var(--mp-sheet-visible, 0px)"
              bottomInset={sheetVisible}
            />
          </div>

          {/* === DESKTOP UI === */}
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="hidden lg:flex absolute top-4 left-4 z-[950] items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#EAE5D9] shadow-lg px-3 py-2 text-xs font-bold text-ink-800 hover:bg-white transition-colors"
          >
            {panelOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            <span>{panelOpen ? t("home.hidePanel") : t("home.showPanel")}</span>
          </button>

          {panelOpen && (
            <div className="hidden lg:flex flex-col absolute top-16 left-4 bottom-4 w-[22rem] z-[900] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#EAE5D9] overflow-hidden">
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

              <div className="px-4 flex items-center justify-between mb-2">
                <h2 className="text-sm font-extrabold text-ink-900">{t("home.nearbyTitle")}</h2>
                <Link href="/list/" className="text-[11px] font-bold text-primary-700 hover:underline flex items-center gap-0.5">
                  {t("home.viewAll")} <ChevronRight className="size-3" />
                </Link>
              </div>

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

              <div className="px-3 pb-3 pt-1 shrink-0">
                <BottomCTA onAdd={openAdd} />
              </div>
            </div>
          )}

          {selectedPlace && (
            <div className="hidden xl:block absolute top-4 right-4 bottom-4 w-80 z-[900]">
              <DetailPanel
                place={selectedPlace}
                onClose={() => setSelectedId(null)}
                onDelete={handleDeletePlace}
              />
            </div>
          )}

          {/* === MOBILE UI === */}
          <div className="pointer-events-none absolute inset-x-4 top-4 z-20 lg:hidden">
            <div className="pointer-events-auto">
              <TopSearchBar
                variant="floating"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </div>

          <MobilePlaceSheets
            places={visiblePlaces}
            selected={selectedPlace}
            status={status}
            onSelect={onSelect}
            onClose={() => setSelectedId(null)}
            onReload={reload}
            onVisibleChange={setSheetVisible}
          />        </div>
      </div>
    </div>
  );
}
