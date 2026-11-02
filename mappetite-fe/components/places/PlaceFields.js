"use client";

import { LocateFixed, Loader2 } from "lucide-react";
import { useCallback, useId } from "react";

import { LocationPicker } from "@/components/map";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { LIMITS } from "@/lib/config";
import { todayISO } from "@/lib/format";
import { isOpen24Hours } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import { PriceSelector, StatusToggle, TagInput } from "./FormControls";
import { RatingInput } from "./Rating";

export const EMPTY_VALUES = {
  name: "",
  address: "",
  location: null,
  status: "wishlist",
  rating: null,
  visited_at: "",
  price_level: null,
  opens_at: "",
  closes_at: "",
  tags: [],
  notes: "",
};

export function valuesFromPlace(place) {
  return {
    name: place.name || "",
    address: place.address || "",
    location: { latitude: place.latitude, longitude: place.longitude },
    status: place.status,
    rating: place.rating ?? null,
    visited_at: place.visited_at || "",
    price_level: place.price_level ?? null,
    opens_at: place.opens_at || "",
    closes_at: place.closes_at || "",
    tags: place.tags.map((tag) => tag.name),
    notes: place.notes || "",
  };
}

/** Drops the validation errors of the fields in `patch` (editing a time also clears the shared hours error). */
export function clearFieldErrors(errors, patch) {
  const next = { ...errors };
  Object.keys(patch).forEach((key) => delete next[key]);
  if ("opens_at" in patch || "closes_at" in patch) delete next.hours;
  return next;
}

/** Request body for POST/PATCH /api/places from form values. */
export function bodyFromValues(values) {
  const visited = values.status === "visited";
  const body = {
    name: values.name.trim(),
    address: values.address.trim() || null,
    latitude: values.location?.latitude,
    longitude: values.location?.longitude,
    status: values.status,
    price_level: values.price_level,
    // Always sent as a pair so that clearing them in the edit form removes the hours.
    opens_at: values.opens_at || null,
    closes_at: values.closes_at || null,
    notes: values.notes.trim() || null,
    tags: values.tags,
  };
  if (visited) {
    body.rating = values.rating;
    body.visited_at = values.visited_at || todayISO();
  }
  return body;
}

/** Client-side checks before calling the API. Returns { field: errorKey }. */
export function validateValues(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "errors.places.name_invalid";
  if (!values.location) errors.location = "add.locationRequired";
  if (Boolean(values.opens_at) !== Boolean(values.closes_at)) errors.hours = "errors.places.hours_invalid";
  return errors;
}

/** Fields shared by "add restaurant" and "edit restaurant". */
export default function PlaceFields({ values, onChange, errors = {}, locationHint }) {
  const { t } = useI18n();
  const { tags, geo, locate } = usePlaces();
  const ids = {
    name: useId(),
    address: useId(),
    notes: useId(),
    visited: useId(),
    location: useId(),
    opens: useId(),
    closes: useId(),
    open24: useId(),
  };
  const visited = values.status === "visited";
  const open24 = isOpen24Hours(values.opens_at, values.closes_at);

  const setLocation = useCallback((location) => onChange({ location }), [onChange]);
  const applyMyLocation = () => {
    if (geo.coords) setLocation(geo.coords);
    else locate(setLocation);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-[16rem_1fr]">
        <div>
          <span id={ids.location} className="field-label">
            {t("add.location")}
          </span>
          <div
            className={`relative h-48 overflow-hidden rounded-xl border ${errors.location ? "border-danger-600" : "border-line"}`}
            aria-describedby={`${ids.location}-hint`}
          >
            <LocationPicker
              value={values.location}
              onChange={setLocation}
              status={values.status}
              fallbackCenter={geo.coords ? [geo.coords.latitude, geo.coords.longitude] : undefined}
              label={t("add.location")}
            />
          </div>
          <p id={`${ids.location}-hint`} className={`field-hint ${errors.location ? "font-semibold text-danger-700" : ""}`}>
            {errors.location ? t(errors.location) : values.location ? t("add.locationHint") : locationHint || t("add.locationPick")}
          </p>
          <button type="button" onClick={applyMyLocation} className="btn btn-sm btn-ghost mt-1 -ml-2">
            {geo.status === "locating" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-3.5" aria-hidden="true" />
            )}
            {t("map.myLocation")}
          </button>
          {geo.status === "denied" ? <p className="field-hint text-danger-700">{t("map.locationDenied")}</p> : null}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor={ids.name} className="field-label">
              {t("add.name")}
            </label>
            <input
              id={ids.name}
              className={`input ${errors.name ? "border-danger-600" : ""}`}
              value={values.name}
              onChange={(event) => onChange({ name: event.target.value })}
              maxLength={LIMITS.name}
              required
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${ids.name}-error` : undefined}
              autoComplete="off"
            />
            {errors.name ? (
              <p id={`${ids.name}-error`} className="field-hint font-semibold text-danger-700">
                {t(errors.name)}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={ids.address} className="field-label">
              {t("add.address")}
            </label>
            <input
              id={ids.address}
              className="input"
              value={values.address}
              onChange={(event) => onChange({ address: event.target.value })}
              maxLength={LIMITS.address}
              aria-describedby={`${ids.address}-hint`}
              autoComplete="off"
            />
            <p id={`${ids.address}-hint`} className="field-hint">
              {t("add.addressHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <StatusToggle
          value={values.status}
          onChange={(status) =>
            onChange(status === "visited" && !values.visited_at ? { status, visited_at: todayISO() } : { status })
          }
        />
        <PriceSelector value={values.price_level} onChange={(price_level) => onChange({ price_level })} />
      </div>

      <fieldset aria-describedby={`${ids.opens}-hint`}>
        <legend className="field-label">
          {t("add.hours")} <span className="font-normal text-ink-500">{t("add.optional")}</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <div>
            <label htmlFor={ids.opens} className="mb-1 block text-[11px] text-ink-500">
              {t("add.opensAt")}
            </label>
            <input
              id={ids.opens}
              type="time"
              className={`input ${errors.hours ? "border-danger-600" : ""}`}
              value={values.opens_at}
              disabled={open24}
              aria-invalid={Boolean(errors.hours)}
              onChange={(event) => onChange({ opens_at: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor={ids.closes} className="mb-1 block text-[11px] text-ink-500">
              {t("add.closesAt")}
            </label>
            <input
              id={ids.closes}
              type="time"
              className={`input ${errors.hours ? "border-danger-600" : ""}`}
              value={values.closes_at}
              disabled={open24}
              aria-invalid={Boolean(errors.hours)}
              onChange={(event) => onChange({ closes_at: event.target.value })}
            />
          </div>
        </div>
        <label htmlFor={ids.open24} className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-xs text-ink-700">
          <input
            id={ids.open24}
            type="checkbox"
            className="size-4 accent-primary-700"
            checked={open24}
            // Equal times mean "open 24 hours" (same convention as the API/database).
            onChange={(event) =>
              onChange(event.target.checked ? { opens_at: "00:00", closes_at: "00:00" } : { opens_at: "", closes_at: "" })
            }
          />
          {t("add.open24")}
        </label>
        <p
          id={`${ids.opens}-hint`}
          className={`field-hint ${errors.hours ? "font-semibold text-danger-700" : ""}`}
          role={errors.hours ? "alert" : undefined}
        >
          {errors.hours ? t(errors.hours) : t("add.hoursHint")}
        </p>
      </fieldset>

      {visited ? (
        <div className="grid gap-5 rounded-2xl bg-visited-50/60 p-4 sm:grid-cols-[1fr_12rem]">
          <RatingInput value={values.rating} onChange={(rating) => onChange({ rating })} label={t("add.rating")} />
          <div>
            <label htmlFor={ids.visited} className="field-label">
              {t("add.visitedAt")}
            </label>
            <input
              id={ids.visited}
              type="date"
              className="input"
              value={values.visited_at}
              max={todayISO()}
              onChange={(event) => onChange({ visited_at: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      <TagInput value={values.tags} onChange={(next) => onChange({ tags: next })} suggestions={tags.map((tag) => tag.name)} />

      <div>
        <label htmlFor={ids.notes} className="field-label">
          {t("add.notes")} <span className="font-normal text-ink-500">{t("add.optional")}</span>
        </label>
        <textarea
          id={ids.notes}
          className="input min-h-24 resize-y"
          value={values.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          maxLength={LIMITS.notes}
          placeholder={t("add.notesPlaceholder")}
          rows={3}
        />
        <p className="field-hint text-right" aria-live="polite">
          {values.notes.length}/{LIMITS.notes}
        </p>
      </div>
    </div>
  );
}
