"use client";

import { usePathname, useRouter } from "next/navigation";

import Modal from "@/components/Modal";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useI18n } from "@/lib/i18n";
import AddPlaceForm from "./AddPlaceForm";

/** Desktop "Tambah Restoran" dialog (mobile uses the /places/new page). */
export default function AddPlaceModal() {
  const { t } = useI18n();
  const { addOpen, closeAdd, upsertPlace, setSelectedId } = usePlaces();
  const router = useRouter();
  const pathname = usePathname();

  const onSaved = (place) => {
    upsertPlace(place);
    setSelectedId(place.id);
    closeAdd();
    if (pathname !== "/") router.push("/");
  };

  return (
    <Modal open={addOpen} onClose={closeAdd} title={t("add.title")} description={t("add.subtitle")} size="lg">
      <AddPlaceForm onSaved={onSaved} onCancel={closeAdd} onNavigate={closeAdd} />
    </Modal>
  );
}
