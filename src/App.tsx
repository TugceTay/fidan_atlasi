import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./MapView";
import BasemapSwitcher from "./components/BasemapSwitcher";
import BottomSheet from "./components/BottomSheet";
import TopBar from "./components/TopBar";
import { deleteEntry, loadEntries, saveEntry } from "./lib/storage";
import { compressToWebp } from "./lib/image";
import { createEntry, deleteEntryById, fetchEntriesInBbox, signPhotoUpload } from "./lib/api";
import { isSupabaseConfigured, supabase, turnstileSiteKey } from "./lib/supabaseClient";
import { basemaps, getBasemapById, resolveBasemapId } from "./lib/basemaps";
import type { Bounds, Category, Entry, FocusFilter } from "./types";

type FilterValue = FocusFilter;
type SheetMode = "create" | "details" | null;

type FormState = {
  addedByName: string;
  description: string;
  category: Category | "";
  photoPreviewUrl: string | null;
  photoUpload: {
    blob: Blob;
    contentType: string;
    fileName: string;
  } | null;
};

const emptyForm: FormState = {
  addedByName: "",
  description: "",
  category: "",
  photoPreviewUrl: null,
  photoUpload: null,
};

const focusToCategory: Record<FocusFilter, Category | "all"> = {
  seedlings: "seedling",
  monument_trees: "meaningful_tree",
  // TODO: Add route layer filtering when Fidan Rotası data is available.
  route: "all",
};

function getErrorStatus(err: unknown): number | string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as any;
  return e.statusCode ?? e.status ?? e.status_code;
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<FilterValue>("seedlings");
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [draftLocation, setDraftLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [basemapId, setBasemapId] = useState(() => resolveBasemapId(localStorage.getItem("basemap")));
  const requestIdRef = useRef(0);


  useEffect(() => {
    if (!isSupabaseConfigured) {
      setEntries(loadEntries());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("basemap", basemapId);
  }, [basemapId]);

  const filteredEntries = useMemo(() => {
    const categoryFilter = focusToCategory[filter];
    if (categoryFilter === "all") return entries;
    return entries.filter((entry) => entry.category === categoryFilter);
  }, [entries, filter]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) || null,
    [entries, selectedEntryId]
  );

  const fetchEntries = useCallback(async (nextBounds: Bounds, nextFilter: FilterValue) => {
    const requestId = ++requestIdRef.current;
    const { data, error } = await fetchEntriesInBbox(nextBounds, focusToCategory[nextFilter]);
    if (requestId !== requestIdRef.current) return;
    if (error) {
      console.error("entries_in_bbox failed", error);
      return;
    }
    setEntries(data ?? []);

  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !bounds) return;
    void fetchEntries(bounds, filter);
  }, [bounds, fetchEntries, filter]);

  const handleMapClick = useCallback((location: { lng: number; lat: number }) => {
    setDraftLocation(location);
    setSelectedEntryId(null);
    setSheetMode("create");
    setErrorMessage(null);
  }, []);

  const handleAddClick = () => {
    setSheetMode("create");
    setSelectedEntryId(null);
    setErrorMessage(null);
  };

  const handleExplore = () => {
    setSheetMode(null);
    setDraftLocation(null);
    setSelectedEntryId(null);
    setErrorMessage(null);
  };

  const handleSearchSelect = useCallback((location: { lng: number; lat: number; label: string }) => {
    setSearchLocation({ lng: location.lng, lat: location.lat });
    setSelectedEntryId(null);
    setSheetMode(null);
    setErrorMessage(null);
  }, []);

  const handleSave = async () => {
    if (!draftLocation || !formState.category) return;

    setIsSaving(true);
    setErrorMessage(null);
    setUploadStatus(null);

    // Local fallback (Supabase yoksa)
    if (!isSupabaseConfigured) {
      const entry: Entry = {
        id: crypto.randomUUID(),
        category: formState.category,
        addedByName: formState.addedByName.trim() || undefined,
        description: formState.description.trim() || undefined,
        photoUrl: formState.photoPreviewUrl || undefined,
        lng: draftLocation.lng,
        lat: draftLocation.lat,
        createdAt: new Date().toISOString(),
      };
      const nextEntries = saveEntry(entry);
      setEntries(nextEntries);
      setDraftLocation(null);
      setFormState(emptyForm);
      setSelectedEntryId(entry.id);
      setSheetMode("details");
      setIsSaving(false);
      return;
    }

    if (!turnstileSiteKey) {
      setErrorMessage("Turnstile yapılandırması eksik.");
      setIsSaving(false);
      return;
    }

    if (!turnstileToken) {
      setErrorMessage("Lütfen doğrulama kutusunu tamamlayın.");
      setIsSaving(false);
      return;
    }

    try {
      let photoPath: string | null = null;
      let photoUrl: string | null = null;

      if (formState.photoUpload) {
        setUploadStatus("Fotoğraf hazırlanıyor…");

        const signed = await signPhotoUpload({
          fileName: formState.photoUpload.fileName,
          contentType: formState.photoUpload.contentType,
        });

        if (signed.error || !signed.data) {
          if (import.meta.env.DEV) console.error("sign_photo_upload failed", signed.error);
          throw new Error(signed.error ?? "Fotoğraf yükleme bağlantısı oluşturulamadı.");
        }

        if (!supabase) throw new Error("Supabase yapılandırılmamış.");

        const { bucket, path, token, publicUrl } = signed.data;

        let resolvedPublicUrl = publicUrl ?? null;
        if (!resolvedPublicUrl) {
          resolvedPublicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        }

        setUploadStatus("Yükleniyor…");
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .uploadToSignedUrl(path, token, formState.photoUpload.blob, {
            contentType: formState.photoUpload.contentType,
          });

        if (uploadError || !uploadData) {
          if (import.meta.env.DEV) {
            console.error("photo upload failed", {
              message: (uploadError as any)?.message,
              status: getErrorStatus(uploadError),
              error: uploadError,
            });
          }
          throw new Error("Fotoğraf yüklenemedi.");
        }

        photoPath = path;
        photoUrl = resolvedPublicUrl;
      }

      setUploadStatus("Kaydediliyor…");

      const created = await createEntry({
        category: formState.category,
        title: formState.addedByName.trim() || null,
        addedByName: formState.addedByName.trim() || null,
        description: formState.description.trim() || null,
        lng: draftLocation.lng,
        lat: draftLocation.lat,
        photo_path: photoPath,
        photo_url: photoUrl,
        turnstile_token: turnstileToken,
      });

      if (created.error) {
        if (import.meta.env.DEV) console.error("create_entry failed", created.error);
        throw new Error(created.error);
      }
      if (!created.data) {
        throw new Error("Kayıt oluşturulamadı.");
      }

      const entry = created.data;
      setEntries((prev) => [entry, ...prev]);
      setDraftLocation(null);
      setFormState(emptyForm);
      setSelectedEntryId(entry.id);
      setSheetMode(null);
      setTurnstileToken(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Beklenmeyen bir hata oldu.");
    } finally {
      setIsSaving(false);
      setUploadStatus(null);
    }
  };

  const handleCancel = () => {
    setDraftLocation(null);
    setFormState(emptyForm);
    setSheetMode(null);
    setErrorMessage(null);
    setPhotoWarning(null);
    setUploadStatus(null);
    setTurnstileToken(null);
  };

  const handleMarkerClick = (entryId: string) => {
    setSelectedEntryId(entryId);
    setDraftLocation(null);
    setSheetMode("details");
  };

  const handlePhotoSelected = async (file: File) => {
    try {
      const optimized = await compressToWebp(file);
      setFormState((prev) => ({
        ...prev,
        photoPreviewUrl: optimized.previewUrl,
        photoUpload: {
          blob: optimized.blob,
          contentType: optimized.contentType,
          fileName: optimized.fileName,
        },
      }));
      setPhotoWarning(optimized.warning ?? null);
    } catch {
      setErrorMessage("Fotoğraf işlenemedi. Başka bir dosya deneyin.");
    }
  };

  const handleCloseDetails = () => {
    setSheetMode(null);
    setSelectedEntryId(null);
  };

  const handleDeleteSelected = async () => {
    if (!selectedEntry) return;
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      if (!isSupabaseConfigured) {
        const nextEntries = deleteEntry(selectedEntry.id);
        setEntries(nextEntries);
      } else {
        const { error } = await deleteEntryById(selectedEntry.id);
        if (error) throw new Error(error);
        setEntries((prev) => prev.filter((entry) => entry.id !== selectedEntry.id));
      }
      setSelectedEntryId(null);
      setSheetMode(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kayıt silinemedi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="app">
      <MapView
        entries={isSupabaseConfigured ? entries : filteredEntries}
        draftLocation={draftLocation}
        selectedEntryId={selectedEntryId}
        searchLocation={searchLocation}
        basemapStyle={getBasemapById(basemapId).style}
        onMapClick={handleMapClick}
        onMarkerClick={handleMarkerClick}
        onBoundsChange={setBounds}
      />

      <TopBar
        filter={filter}
        onFilterChange={setFilter}
        onExplore={handleExplore}
        onAdd={handleAddClick}
        onSearchSelect={handleSearchSelect}
      />
      <BasemapSwitcher basemaps={basemaps} currentBasemapId={basemapId} onChange={setBasemapId} />

      <BottomSheet
        mode={sheetMode === "details" ? "details" : "create"}
        isOpen={sheetMode !== null}
        formState={formState}
        selectedEntry={selectedEntry}
        hasDraftLocation={Boolean(draftLocation)}
        isSaving={isSaving}
        isDeleting={isDeleting}
        uploadStatus={uploadStatus}
        errorMessage={errorMessage}
        photoWarning={photoWarning}
        turnstileSiteKey={turnstileSiteKey}
        isSupabaseConfigured={isSupabaseConfigured}
        onChange={(next) => setFormState((prev) => ({ ...prev, ...next }))}
        onSave={handleSave}
        onCancel={handleCancel}
        onClose={handleCloseDetails}
        onDelete={handleDeleteSelected}
        onPhotoSelected={handlePhotoSelected}
        onTurnstileToken={setTurnstileToken}
      />
    </div>
  );
}
