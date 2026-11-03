"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Modal from "@/components/Modal";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { photoItemsFromPlace, syncPhotos } from "@/lib/photos";
import PlaceFields, { bodyFromValues, clearFieldErrors, validateValues, valuesFromPlace } from "./PlaceFields";

/** The same fields as the "Add restaurant" form, pre-filled with the saved data. */
function EditPlaceForm({ place, overrides, onSaved, onPartial, onCancel }) {
  const { t, tError } = useI18n();
  const [values, setValues] = useState(() => ({ ...valuesFromPlace(place), ...overrides }));
  const [errors, setErrors] = useState({});
  const [save, setSave] = useState({ status: "idle", error: null });

  const onChange = useCallback((patch) => {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => clearFieldErrors(previous, patch));
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = validateValues(values);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSave({ status: "saving", error: null });
    let updated;
    try {
      updated = await api.updatePlace(place.id, bodyFromValues(values));
    } catch (error) {
      setSave({ status: "error", error });
      return;
    }

    // The data is saved; now make the server's photos match the form.
    const { place: fresh, failed, failedOther } = await syncPhotos(updated, values.photos);
    if (failed.length === 0 && failedOther === 0) {
      onSaved(fresh);
      return;
    }
    // Keep the dialog open so nothing is lost: show what the server has now plus the files that failed.
    onPartial(fresh);
    setValues((previous) => ({ ...previous, photos: [...photoItemsFromPlace(fresh), ...failed] }));
    setSave({ status: "partial", count: failed.length + failedOther });
  };

  const saving = save.status === "saving";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <PlaceFields values={values} onChange={onChange} errors={errors} disabled={saving} />

      {save.status === "error" ? (
        <div className="alert alert-error" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{tError(save.error)}</p>
        </div>
      ) : null}
      {save.status === "partial" ? (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{t("photos.partialFail", { count: save.count })}</p>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-3 border-t border-line bg-white px-6 py-4 sm:-mx-8 sm:px-8">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
          {t("add.cancel")}
        </button>
        <button type="submit" className="btn btn-primary px-6" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {saving ? t("add.saving") : t("add.saveChanges")}
        </button>
      </div>
    </form>
  );
}

/**
 * "Edit restaurant" dialog, mounted once in AppShell (like AddPlaceModal) so any page can open it
 * with `openEdit(id)`. The form is only mounted while open, so it starts fresh from the saved data
 * every time.
 */
export default function EditPlaceModal() {
  const { t } = useI18n();
  const { places, editTarget, closeEdit, upsertPlace } = usePlaces();
  const [notice, setNotice] = useState(null);

  const place = editTarget ? places.find((item) => item.id === editTarget.id) ?? null : null;
  const open = Boolean(place);

  // Auto-hide the "saved" confirmation.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const onSaved = (updated) => {
    upsertPlace(updated);
    closeEdit();
    setNotice(t("place.saved"));
  };

  return (
    <>
      <Modal
        open={open}
        onClose={closeEdit}
        title={t("edit.title")}
        description={place ? t("edit.subtitle", { name: place.name }) : undefined}
        size="lg"
      >
        {place ? (
          <EditPlaceForm
            place={place}
            overrides={editTarget.overrides}
            onSaved={onSaved}
            onPartial={upsertPlace}
            onCancel={closeEdit}
          />
        ) : null}
      </Modal>

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[1300] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-pop lg:bottom-8"
        >
          <CheckCircle2 className="size-4 text-primary-100" aria-hidden="true" />
          {notice}
        </div>
      ) : null}
    </>
  );
}
