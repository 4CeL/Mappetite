"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import AddPlaceForm from "@/components/places/AddPlaceForm";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useI18n } from "@/lib/i18n";

function NewPlaceContent() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { upsertPlace, setSelectedId } = usePlaces();
  // `url` / `text` let other apps (or a future PWA share target) prefill the link.
  const initialUrl = params.get("url") || params.get("text") || "";

  const onSaved = (place) => {
    upsertPlace(place);
    setSelectedId(place.id);
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-6 lg:px-6 lg:pt-10">
      <h1 className="text-[22px] font-bold text-ink-900 lg:text-[26px]">{t("add.title")}</h1>
      <p className="mt-1 text-[13px] text-ink-500">{t("add.subtitle")}</p>
      <div className="card mt-5 px-6 pb-5 pt-6 sm:px-8">
        <AddPlaceForm
          initialUrl={initialUrl}
          onSaved={onSaved}
          onCancel={() => router.back()}
          actionsClassName="bottom-[4.5rem] lg:bottom-0"
        />
      </div>
    </div>
  );
}

export default function NewPlacePage() {
  return (
    <Suspense fallback={null}>
      <NewPlaceContent />
    </Suspense>
  );
}
