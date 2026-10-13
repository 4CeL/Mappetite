"use client";

import { AlertTriangle, CheckCircle2, Info, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import PlaceFields, { bodyFromValues, EMPTY_VALUES, validateValues } from "./PlaceFields";

function DuplicateNotice({ title, duplicates, onNavigate, onForce }) {
  const { t } = useI18n();
  return (
    <div className="alert alert-warning" role="alert">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {duplicates.map((duplicate) => (
            <li key={duplicate.id}>
              <Link
                href={`/places/detail/?id=${encodeURIComponent(duplicate.id)}`}
                onClick={onNavigate}
                className="font-bold underline underline-offset-2"
              >
                {t("add.view")}: {duplicate.name}
              </Link>
            </li>
          ))}
        </ul>
        {onForce ? (
          <button type="button" onClick={onForce} className="btn btn-sm btn-outline mt-3">
            {t("add.saveAnyway")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Paste a Google Maps link → preview → save (PRD flow 1).
 * `initialUrl` (share target / ?url=) is parsed automatically on mount.
 */
export default function AddPlaceForm({ initialUrl = "", onSaved, onCancel, onNavigate, actionsClassName = "" }) {
  const { t, tError, lang } = useI18n();
  const linkId = useId();
  const [link, setLink] = useState(initialUrl);
  const [parse, setParse] = useState({ status: initialUrl ? "parsing" : "idle", error: null, duplicates: [] });
  const [manual, setManual] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [meta, setMeta] = useState({ google_maps_url: null, google_place_ref: null });
  const [errors, setErrors] = useState({});
  const [submit, setSubmit] = useState({ status: "idle", error: null, duplicates: [] });
  const autoParsedRef = useRef(false);

  const onChange = useCallback((patch) => {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const runParse = useCallback(
    async (url) => {
      try {
        const data = await api.parseLink(url, lang);
        setValues((previous) => ({
          ...previous,
          name: data.name || previous.name,
          address: data.address || previous.address,
          location: { latitude: data.latitude, longitude: data.longitude },
        }));
        setMeta({ google_maps_url: data.google_maps_url, google_place_ref: data.google_place_ref });
        setParse({ status: "done", error: null, duplicates: data.duplicates || [] });
        setErrors({});
      } catch (error) {
        if (error?.key === "places.link_no_location") {
          const data = error.data || {};
          setValues((previous) => ({ ...previous, name: data.name || previous.name }));
          setMeta({ google_maps_url: data.google_maps_url || null, google_place_ref: data.google_place_ref || null });
          setParse({ status: "no_location", error: null, duplicates: [] });
        } else {
          setParse({ status: "error", error, duplicates: [] });
        }
      }
    },
    [lang],
  );

  useEffect(() => {
    if (initialUrl && !autoParsedRef.current) {
      autoParsedRef.current = true;
      runParse(initialUrl);
    }
  }, [initialUrl, runParse]);

  const handleFetch = (event) => {
    event.preventDefault();
    const url = link.trim();
    if (!url) return;
    setParse({ status: "parsing", error: null, duplicates: [] });
    setSubmit({ status: "idle", error: null, duplicates: [] });
    runParse(url);
  };

  const save = async (force) => {
    const found = validateValues(values);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSubmit({ status: "saving", error: null, duplicates: [] });
    try {
      const place = await api.createPlace({ ...bodyFromValues(values), ...meta, force });
      onSaved?.(place);
    } catch (error) {
      if (error?.key === "places.possible_duplicate" || error?.key === "places.already_saved") {
        setSubmit({ status: "duplicate", error, duplicates: error.data?.duplicates || [] });
      } else {
        setSubmit({ status: "error", error, duplicates: [] });
      }
    }
  };

  const handleSave = (event) => {
    event.preventDefault();
    save(false);
  };

  const parsing = parse.status === "parsing";
  const saving = submit.status === "saving";
  const showFields = manual || parse.status === "done" || parse.status === "no_location";

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleFetch} noValidate>
        <label htmlFor={linkId} className="field-label">
          {t("add.linkLabel")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
            <input
              id={linkId}
              className="input min-h-12 pl-11"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={t("add.linkPlaceholder")}
              value={link}
              onChange={(event) => setLink(event.target.value)}
              aria-describedby={`${linkId}-hint`}
            />
          </div>
          <button type="submit" className="btn btn-primary min-h-12 px-6" disabled={parsing || !link.trim()}>
            {parsing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {parsing ? t("add.fetching") : t("add.fetch")}
          </button>
        </div>
        <p id={`${linkId}-hint`} className="field-hint">
          {t("add.howTo")}
          {!showFields ? (
            <>
              {" "}
              <button type="button" onClick={() => setManual(true)} className="font-bold text-primary-800 underline underline-offset-2">
                {t("add.manual")}
              </button>
            </>
          ) : null}
        </p>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {parse.status === "done" ? (
          <p className="flex items-center gap-2 text-[13px] font-semibold text-primary-800">
            <CheckCircle2 className="size-4 text-primary-700" aria-hidden="true" />
            {t("add.fetched")}
          </p>
        ) : null}
        {parse.status === "no_location" ? (
          <div className="alert alert-info">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{t("add.noLocation")}</p>
          </div>
        ) : null}
        {parse.status === "error" ? (
          <div className="alert alert-error" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p>{tError(parse.error)}</p>
              {!manual ? (
                <button type="button" onClick={() => setManual(true)} className="btn btn-sm btn-outline mt-2">
                  {t("add.manual")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {parse.duplicates.length > 0 && submit.status !== "duplicate" ? (
          <DuplicateNotice
            title={parse.duplicates.some((item) => item.exact) ? t("add.alreadySavedTitle") : t("add.duplicateTitle")}
            duplicates={parse.duplicates}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>

      {showFields ? (
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
          <PlaceFields
            values={values}
            onChange={onChange}
            errors={errors}
            locationHint={manual && parse.status !== "done" ? t("add.manualHint") : undefined}
          />

          {submit.status === "duplicate" ? (
            <DuplicateNotice
              title={submit.error.key === "places.already_saved" ? t("add.alreadySavedTitle") : t("add.duplicateTitle")}
              duplicates={submit.duplicates}
              onNavigate={onNavigate}
              onForce={submit.error.key === "places.possible_duplicate" ? () => save(true) : undefined}
            />
          ) : null}
          {submit.status === "error" ? (
            <div className="alert alert-error" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{tError(submit.error)}</p>
            </div>
          ) : null}

          <div className={`sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-3 border-t border-line bg-white px-6 py-4 sm:-mx-8 sm:px-8 ${actionsClassName}`}>
            {onCancel ? (
              <button type="button" className="btn btn-outline" onClick={onCancel}>
                {t("add.cancel")}
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary px-6" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? t("add.saving") : t("add.save")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
