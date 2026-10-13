"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  List as ListIcon,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Star,
  Check,
  Bookmark,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import RestaurantFiltersSidebar from "@/components/places/RestaurantFiltersSidebar";
import RestaurantListCard from "@/components/places/RestaurantListCard";
import { PlaceCardSkeleton } from "@/components/places/PlaceCard";
import EmptyState from "@/components/places/EmptyState";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api } from "@/lib/api";
import { sortPlaces } from "@/lib/filters";
import { useI18n } from "@/lib/i18n";

export default function ListPage() {
  const { t } = useI18n();
  const {
    status,
    places,
    reload,
    openAdd,
    removePlace,
    tags,
    geo,
    locate,
  } = usePlaces();

  // Local filter & UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all"); // 'all' | 'wishlist' | 'visited' | 'priority'
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract locations with counts from places' addresses
  const locationOptions = useMemo(() => {
    const map = new Map();
    places.forEach((p) => {
      if (!p.address) return;
      const parts = p.address.split(",").map((s) => s.trim()).filter(Boolean);
      // Take meaningful city/area parts
      parts.forEach((part) => {
        if (part.length < 3) return;
        const count = map.get(part) || 0;
        map.set(part, count + 1);
      });
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [places]);

  // Status counts
  const counts = useMemo(() => {
    const wishlist = places.filter((p) => p.status === "wishlist").length;
    const visited = places.filter((p) => p.status === "visited").length;

    return {
      all: places.length,
      wishlist,
      visited,
    };
  }, [places]);

  // Filtered and sorted places
  const visiblePlaces = useMemo(() => {
    let result = [...places];

    // Status filter
    if (activeStatus === "wishlist") {
      result = result.filter((p) => p.status === "wishlist");
    } else if (activeStatus === "visited") {
      result = result.filter((p) => p.status === "visited");
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const matchName = p.name?.toLowerCase().includes(q);
        const matchAddress = p.address?.toLowerCase().includes(q);
        const matchNotes = p.notes?.toLowerCase().includes(q);
        const matchTags = p.tags?.some((t) => t.name.toLowerCase().includes(q));
        return matchName || matchAddress || matchNotes || matchTags;
      });
    }

    // Tag filter
    if (selectedTagIds.length > 0) {
      result = result.filter((p) =>
        p.tags?.some((t) => selectedTagIds.includes(t.id))
      );
    }

    // Location filter
    if (selectedLocations.length > 0) {
      result = result.filter((p) =>
        selectedLocations.some((loc) =>
          p.address?.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    // Sort
    return sortPlaces(result, sortBy);
  }, [
    places,
    activeStatus,
    searchQuery,
    selectedTagIds,
    selectedLocations,
    sortBy,
  ]);

  // Handlers
  const handleTagToggle = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleLocationToggle = (locName) => {
    setSelectedLocations((prev) =>
      prev.includes(locName)
        ? prev.filter((name) => name !== locName)
        : [...prev, locName]
    );
  };

  const handleClearAll = () => {
    setActiveStatus("all");
    setSelectedTagIds([]);
    setSelectedLocations([]);
    setSearchQuery("");
  };

  const handleDeletePlace = async (place) => {
    if (window.confirm(`Hapus "${place.name}" dari daftar?`)) {
      try {
        await api.deletePlace(place.id);
        removePlace(place.id);
      } catch (err) {
        alert("Gagal menghapus restoran. Coba lagi.");
      }
    }
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    if (val === "nearest" && !geo.coords) locate();
  };

  // Main list content state
  let content;
  if (status === "loading") {
    content = (
      <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-3.5"}>
        {[0, 1, 2, 3].map((key) => (
          <PlaceCardSkeleton key={key} compact />
        ))}
      </div>
    );
  } else if (status === "error") {
    content = <EmptyState kind="error" onRetry={reload} />;
  } else if (places.length === 0) {
    content = <EmptyState kind="empty" />;
  } else if (visiblePlaces.length === 0) {
    content = <EmptyState kind="filtered" onReset={handleClearAll} />;
  } else {
    content = (
      <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-3.5"}>
        {visiblePlaces.map((place) => (
          <RestaurantListCard
            key={place.id}
            place={place}
            viewMode={viewMode}
            onDelete={handleDeletePlace}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row">
      {/* 1. Left Sidebar (matches mockup) */}
      <AppSidebar
        counts={counts}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
        className="hidden lg:flex h-screen sticky top-0"
      />

      {/* 2. Main Area (Right of Left Sidebar) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header / Search Bar: spans full width across Center & Right */}
        <TopSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-30"
        />

        {/* Content Area under Navbar (Center list + Right Filter Card) */}
        <div className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto flex flex-col xl:flex-row gap-8 items-start">
          {/* Center Main Content: Restaurants List */}
          <main className="flex-1 min-w-0 w-full">
            {/* Header Title & "+ Add Restaurant" Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink-900 tracking-tight">
                  My Restaurants
                </h1>
                <p className="text-xs sm:text-sm text-ink-500 mt-1">
                  Your collection of amazing places to eat.{" "}
                  <span className="font-semibold text-ink-700">{counts.all} restaurants in total.</span>
                </p>
              </div>

              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#485635] hover:bg-[#3B472A] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all hover:shadow-md shrink-0 self-start sm:self-auto"
              >
                <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
                <span>Add Restaurant</span>
              </button>
            </div>

            {/* Quick Status Filter Tabs & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2">
              {/* Quick Status Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setActiveStatus("all")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    activeStatus === "all"
                      ? "bg-[#3D4A2D] text-white shadow-xs"
                      : "bg-[#EFECE3] text-ink-700 hover:bg-[#E5E1D5]"
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[11px] ${activeStatus === "all" ? "text-stone-300" : "text-ink-400"}`}>
                    {counts.all}
                  </span>
                </button>

                {/* Want to Visit */}
                <button
                  type="button"
                  onClick={() => setActiveStatus("wishlist")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    activeStatus === "wishlist"
                      ? "bg-[#FDF1EB] text-[#D96B43] border border-[#FADCD0] font-bold shadow-xs"
                      : "bg-white text-ink-700 border border-[#ECE7DC] hover:bg-[#FDF1EB]/60 hover:text-[#D96B43]"
                  }`}
                >
                  <span className="size-2 rounded-full bg-[#D96B43]" />
                  <span>Want to Visit</span>
                  <span className="text-[11px] text-ink-400 font-normal">{counts.wishlist}</span>
                </button>

                {/* Visited */}
                <button
                  type="button"
                  onClick={() => setActiveStatus("visited")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    activeStatus === "visited"
                      ? "bg-[#EDF4EB] text-[#4E8746] border border-[#DCEDD9] font-bold shadow-xs"
                      : "bg-white text-ink-700 border border-[#ECE7DC] hover:bg-[#EDF4EB]/60 hover:text-[#4E8746]"
                  }`}
                >
                  <Check className="size-3 stroke-[3] text-[#4E8746]" />
                  <span>Visited</span>
                  <span className="text-[11px] text-ink-400 font-normal">{counts.visited}</span>
                </button>
              </div>

              {/* Right Controls: Sort & View Toggle */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Mobile Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="xl:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#E0DBCB] bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-stone-50"
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span>Filters</span>
                  {(selectedTagIds.length > 0 || selectedLocations.length > 0) && (
                    <span className="size-2 rounded-full bg-primary-700" />
                  )}
                </button>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-ink-500">
                  <span className="hidden sm:inline">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="rounded-xl border border-[#E0DBCB] bg-white px-2.5 py-1.5 text-xs font-bold text-ink-800 focus:border-primary-700 focus:outline-none"
                  >
                    <option value="newest">Recently added</option>
                    <option value="rating">Highest rated</option>
                    <option value="nearest">Nearest to me</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>

                {/* View Mode Toggle: List / Grid */}
                <div className="flex items-center rounded-xl border border-[#E0DBCB] bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg p-1.5 transition-colors ${
                      viewMode === "list"
                        ? "bg-[#EFECE3] text-ink-900 font-bold"
                        : "text-ink-400 hover:text-ink-700"
                    }`}
                    aria-label="List view"
                  >
                    <ListIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg p-1.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-[#EFECE3] text-ink-900 font-bold"
                        : "text-ink-400 hover:text-ink-700"
                    }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Restaurant List Cards */}
            {content}
          </main>

          {/* Right Column: Filter Card (Under Navbar, matching user screenshot) */}
          <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0 sticky top-24">
            <RestaurantFiltersSidebar
              tags={tags}
              selectedTagIds={selectedTagIds}
              onTagToggle={handleTagToggle}
              locations={locationOptions}
              selectedLocations={selectedLocations}
              onLocationToggle={handleLocationToggle}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-[#FAF8F3] h-full overflow-y-auto p-6 shadow-2xl z-10 flex flex-col justify-between">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-ink-500 hover:bg-stone-200"
              aria-label="Tutup Filter"
            >
              <X className="size-5" />
            </button>
            <RestaurantFiltersSidebar
              tags={tags}
              selectedTagIds={selectedTagIds}
              onTagToggle={handleTagToggle}
              locations={locationOptions}
              selectedLocations={selectedLocations}
              onLocationToggle={handleLocationToggle}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      )}
    </div>
  );
}
