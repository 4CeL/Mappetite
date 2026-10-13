"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Check } from "lucide-react";

export default function RestaurantFiltersSidebar({
  tags = [],
  selectedTagIds = [],
  onTagToggle,
  locations = [],
  selectedLocations = [],
  onLocationToggle,
  onClearAll,
  className = "",
}) {
  const [tagSearch, setTagSearch] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return tags;
    const q = tagSearch.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  const visibleTags = showAllTags ? filteredTags : filteredTags.slice(0, 8);

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return locations;
    const q = locationSearch.toLowerCase();
    return locations.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [locations, locationSearch]);

  return (
    <div
      className={`w-full rounded-2xl border border-[#ECE7DD] bg-white p-5 shadow-xs select-none flex flex-col gap-4 ${className}`}
    >
      {/* Card Header: Filters & Clear all */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-sm font-bold text-ink-900 tracking-tight">Filters</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-[#5B6D43] hover:text-[#3C4A2A] transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* 1. Tags Section */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-ink-900">Tags</h3>

        {/* Small Tag Search */}
        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full rounded-xl border border-[#E7E2D5] bg-white pl-8 pr-3 py-1.5 text-xs text-ink-800 placeholder:text-ink-400 focus:border-primary-700 focus:outline-none"
          />
        </div>

        {/* Tag Checkbox List */}
        <div className="flex flex-col gap-2 text-xs max-h-48 overflow-y-auto pr-1">
          {visibleTags.length === 0 ? (
            <p className="text-[11px] text-ink-400 py-1">Tidak ada tag yang cocok</p>
          ) : (
            visibleTags.map((tag) => {
              const checked = selectedTagIds.includes(tag.id);
              return (
                <label key={tag.id} className="flex items-center justify-between cursor-pointer group py-0.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onTagToggle(tag.id)}
                      className="sr-only"
                    />
                    <span
                      className={`size-4 rounded flex items-center justify-center border transition-colors ${
                        checked
                          ? "bg-primary-700 border-primary-700 text-white"
                          : "border-stone-300 bg-white group-hover:border-stone-400"
                      }`}
                    >
                      {checked && <Check className="size-3 stroke-[3]" />}
                    </span>
                    <span className="text-ink-700 font-medium group-hover:text-ink-900 capitalize">
                      {tag.name}
                    </span>
                  </div>
                  <span className="text-ink-400 text-[11px] font-medium">{tag.count}</span>
                </label>
              );
            })
          )}
        </div>

        {filteredTags.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllTags(!showAllTags)}
            className="flex items-center gap-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900 pt-0.5"
          >
            {showAllTags ? (
              <>
                Show less <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#F0EBE0] my-0.5" />

      {/* 2. Location Section */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-ink-900">Location</h3>

        {/* Small Location Search */}
        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Search location..."
            className="w-full rounded-xl border border-[#E7E2D5] bg-white pl-8 pr-3 py-1.5 text-xs text-ink-800 placeholder:text-ink-400 focus:border-primary-700 focus:outline-none"
          />
        </div>

        {/* Location Checkbox List */}
        <div className="flex flex-col gap-2 text-xs max-h-40 overflow-y-auto pr-1">
          {filteredLocations.length === 0 ? (
            <p className="text-[11px] text-ink-400 py-1">Belum ada data lokasi</p>
          ) : (
            filteredLocations.map((loc) => {
              const checked = selectedLocations.includes(loc.name);
              return (
                <label key={loc.name} className="flex items-center justify-between cursor-pointer group py-0.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onLocationToggle(loc.name)}
                      className="sr-only"
                    />
                    <span
                      className={`size-4 rounded flex items-center justify-center border transition-colors ${
                        checked
                          ? "bg-[#D96B43] border-[#D96B43] text-white"
                          : "border-stone-300 bg-white group-hover:border-stone-400"
                      }`}
                    >
                      {checked && <Check className="size-3 stroke-[3]" />}
                    </span>
                    <span className="text-ink-700 font-medium group-hover:text-ink-900">{loc.name}</span>
                  </div>
                  <span className="text-ink-400 text-[11px] font-medium">{loc.count}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
