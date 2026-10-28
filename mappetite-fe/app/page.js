"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  ChevronDown,
  Compass,
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
  Clock,
  Wallet,
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
  const { lang, t, formatDistance } = useI18n();
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
            
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs">
              {place.rating != null && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-ink-800">{Number(place.rating).toFixed(1)}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3 text-[#F59E0B] fill-current" />
                    ))}
                  </div>
                  {place.google_maps_rating_count != null && (
                    <span className="text-ink-400">({place.google_maps_rating_count.toLocaleString()})</span>
                  )}
                </div>
              )}
              <span className="text-ink-300">·</span>
              <span className="font-semibold text-ink-700">Rp 25–50K</span>
            </div>

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

          <div className="flex items-start gap-2.5">
            <Clock className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p>
                <span className="font-semibold text-[#4E8746]">Open</span>
                <span className="text-ink-600"> · Closes 12.00 am</span>
                <ChevronDown className="inline size-3 ml-1 text-ink-400" />
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Wallet className="size-4 text-[#D96B43] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-ink-800">Rp 25.000–50.000 per person</p>
            </div>
          </div>

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
              <Edit2 className="size-4" /> {t("place.detailShort")}
            </Link>
            {onDelete && (
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
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row overflow-hidden">
      
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
              controlsClassName={`bottom-32 right-4 w-fit lg:bottom-6 lg:right-6 ${
                selectedPlace ? "xl:right-[22rem]" : ""
              }`}
              attributionOffset="0px"
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
          {/* Tambahkan pointer-events-none agar map tetap bisa di-klik di area kosong */}
          <div className="lg:hidden absolute inset-0 pointer-events-none z-10 flex flex-col justify-end">
            <div className="absolute top-4 inset-x-4 pointer-events-auto z-20">
              <TopSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                className="rounded-full shadow-lg border-0 bg-white"
              />
            </div>

            <MobileBottomSheet
              places={visiblePlaces}
              selected={selectedPlace}
              counts={counts}
              status={status}
              onSelect={onSelect}
              onClose={() => setSelectedId(null)}
              onAdd={openAdd}
              onReload={reload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Bottom Sheet (Fix Interaksi & Layout) ────────────────── */
function MobileBottomSheet({ places, selected, counts, status, onSelect, onClose, onAdd, onReload }) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullList, setShowFullList] = useState(false);
  
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (selected) {
      setIsExpanded(true);
      setImgError(false);
    }
  }, [selected]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const y = e.touches[0].clientY;
    setCurrentY(y);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaY = currentY - startY;
    
    if (deltaY < -50) {
      setIsExpanded(true);
    } else if (deltaY > 50) {
      setIsExpanded(false);
      if (selected) onClose();
      setShowFullList(false);
    }
  };

  let translateStyle = {};
  if (isDragging) {
    const deltaY = currentY - startY;
    translateStyle = {
      transform: `translateY(calc(${isExpanded ? '0px' : 'calc(100% - 4.6rem)'} + ${deltaY}px))`,
      transition: 'none'
    };
  }

  return (
    // pointer-events-none pada wrapper fixed agar area atas (peta) tembus klik
    <div className="pointer-events-none fixed bottom-0 left-0 w-full z-50 flex justify-center">
      <div
        style={translateStyle}
        // pointer-events-auto dikembalikan ke dalam panel agar kontennya bisa di-scroll & diklik
        className={`pointer-events-auto w-full bg-[#FAF8F3] text-ink-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col border-t border-[#EAE5D9] transition-transform duration-300 ease-out h-[85dvh] overflow-hidden ${
          isExpanded ? "translate-y-0" : "translate-y-[calc(100%-4.6rem)]"
        }`}
      >
        {/* Header (Tinggi 4.6rem) */}
        <div 
          className="h-[4.6rem] shrink-0 bg-[#FAF8F3] z-20 cursor-grab active:cursor-grabbing flex flex-col justify-center" 
          onClick={() => setIsExpanded((v) => !v)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full flex justify-center pt-2 pb-1">
            <span className="h-1.5 w-12 rounded-full bg-stone-300" aria-hidden="true" />
          </div>

          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <MapPin className="size-4 text-[#485635]" aria-hidden="true" />
              {status === "loading" ? t("app.loading") : `${places.length} restaurants`}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className="inline-flex items-center gap-1 rounded-full bg-[#485635] text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-colors hover:bg-[#3B472A]"
              >
                <Plus className="size-3.5" />
                Add
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsExpanded(true); 
                  setShowFullList((v) => !v); 
                  if(selected) onClose(); 
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[#EAE5D9] bg-white text-ink-800 px-3 py-1.5 text-xs font-bold shadow-sm"
              >
                {showFullList ? "Maps" : "List"}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - overflow-y-auto untuk list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative z-10 pb-8">
           {selected ? (
              <div className="flex flex-col">
                 <div className="relative w-full h-48 bg-stone-200 shrink-0 mb-4">
                    {!imgError ? (
                      <img
                        src={getFoodPhoto(selected)}
                        alt={selected.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PlaceThumb place={selected} className="w-full h-full rounded-none" iconClassName="size-12" />
                    )}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                    <button
                      onClick={() => { onClose(); setIsExpanded(true); }}
                      className="absolute top-3 right-3 size-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-ink-700 hover:bg-white transition-colors"
                    >
                      <X className="size-5" />
                    </button>
                 </div>

                 <div className="px-4">
                    <div className="mb-4">
                      <h2 className="text-xl font-extrabold text-ink-900 leading-tight">{selected.name}</h2>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-sm">
                        {selected.rating != null && (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-ink-800">{Number(selected.rating).toFixed(1)}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="size-3.5 text-[#F59E0B] fill-current" />
                              ))}
                            </div>
                            {selected.google_maps_rating_count != null && (
                              <span className="text-ink-400">({selected.google_maps_rating_count.toLocaleString()})</span>
                            )}
                          </div>
                        )}
                        <span className="text-ink-300">·</span>
                        <span className="font-semibold text-ink-700">Rp 25–50K</span>
                      </div>
                      <p className="text-sm text-ink-500 mt-1">
                        {selected.tags?.[0]?.name || "Restoran"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-5">
                       <a
                        href={openInMapsUrl(selected)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-[#485635] text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#3B472A]"
                      >
                        <Navigation className="size-4" /> Rute
                      </a>
                      <a
                        href={`/places/detail/?id=${encodeURIComponent(selected.id)}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#EAE5D9] text-ink-900 py-3 rounded-xl text-sm font-bold hover:bg-stone-50"
                      >
                        <Edit2 className="size-4" /> Detail
                      </a>
                    </div>

                    <div className="flex flex-col gap-3 text-sm text-ink-700">
                      {selected.address && (
                        <div className="flex items-start gap-3">
                           <MapPin className="size-5 shrink-0 text-[#D96B43] mt-0.5" />
                           <p className="leading-relaxed">{selected.address}</p>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                         <Clock className="size-5 shrink-0 text-[#D96B43] mt-0.5" />
                         <div>
                            <p>
                              <span className="text-[#4E8746] font-semibold">Open</span>
                              <span className="text-ink-600"> · Closes 12.00 am</span>
                              <ChevronDown className="inline size-4 ml-1 text-ink-400" />
                            </p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Wallet className="size-5 shrink-0 text-[#D96B43] mt-0.5" />
                         <div>
                           <p className="font-semibold text-ink-900">Rp 25.000–50.000 per person</p>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>
           ) : showFullList ? (
              <div className="flex flex-col gap-2 pt-2 px-3">
                 {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => onSelect(place.id)}
                      className="flex items-center gap-3 w-full p-2 rounded-2xl bg-white border border-[#EAE5D9] hover:bg-[#F2EFE8] text-left transition-colors shadow-sm"
                    >
                      <img src={getFoodPhoto(place)} className="size-16 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-ink-900 truncate">{place.name}</h4>
                        <p className="text-[11px] text-ink-500 truncate">{shortArea(place.address)}</p>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-700">
                           <Star className="size-3 text-amber-500 fill-current" />
                           {Number(place.rating || 4.5).toFixed(1)} • {place.distanceKm ? `${place.distanceKm.toFixed(1)} km` : "Dekat"}
                        </div>
                      </div>
                    </button>
                 ))}
              </div>
           ) : (
             <div className="pt-1">
                {/* 
                  PERBAIKAN: 
                  Padding bawah dihilangkan agar space kosong tidak muncul.
                  Kartu tinggi otomatis (min-h-[20rem]).
                */}
                <div 
                  className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 hide-scrollbar items-stretch"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {status === "loading" ? (
                    <div className="w-[300px] h-[350px] bg-stone-200 rounded-3xl animate-pulse shrink-0 snap-center"></div>
                  ) : status === "error" ? (
                    <div className="w-full"><EmptyState kind="error" onRetry={onReload} /></div>
                  ) : places.length === 0 ? (
                    <div className="w-full"><EmptyState kind="empty" /></div>
                  ) : (
                    places.map((place) => (
                      <div
                        key={place.id}
                        onClick={() => onSelect(place.id)}
                        // Menambah tinggi kartu secara natural
                        className="w-[300px] min-h-[20rem] shrink-0 snap-center bg-white border border-[#EAE5D9] rounded-3xl overflow-hidden shadow-sm flex flex-col text-left transition-transform active:scale-[0.98] cursor-pointer"
                      >
                        <div className="relative h-48 w-full bg-stone-100 shrink-0">
                           <img
                              src={getFoodPhoto(place)}
                              alt={place.name}
                              className="w-full h-full object-cover"
                           />
                           <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                           <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-ink-900 text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                              📍 {place.distanceKm ? `${place.distanceKm.toFixed(1)} km` : "Dekat"}
                           </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col bg-white">
                          <div className="flex items-center justify-between mb-1.5">
                             <h3 className="text-lg font-extrabold text-ink-900 truncate leading-tight">{place.name}</h3>
                          </div>
                          
                          <p className="text-[13px] text-ink-600 flex items-center gap-1.5">
                             <span className="font-bold text-ink-900">{Number(place.rating || 4.5).toFixed(1)}</span>
                             <Star className="size-3.5 text-[#F59E0B] fill-current" />
                             <span className="text-ink-400">({place.google_maps_rating_count || "54"})</span>
                             · {place.tags?.[0]?.name || "Restoran"}
                          </p>

                          <p className="text-[13px] mt-2 flex items-center gap-1.5">
                             <span className="text-[#4E8746] font-semibold">Open</span>
                             <span className="text-ink-300">·</span>
                             <span className="text-ink-500">Closes 11.00 pm</span>
                             <span className="text-ink-300">·</span>
                             <span className="text-ink-500">{place.distanceKm ? `${place.distanceKm.toFixed(1)} km` : ""}</span>
                          </p>

                          <p className="text-[12px] text-ink-400 mt-2.5 truncate">
                             {shortArea(place.address) || "Area"} : Trending
                          </p>
                          
                          <div className="mt-auto" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {!status && places.length > 0 && (
                  <div className="px-4 mt-4 mb-2">
                    <button 
                      onClick={() => setShowFullList(true)}
                      className="w-full py-3.5 bg-white border border-[#EAE5D9] rounded-full text-[13px] font-bold text-ink-800 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      See all Trending <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}