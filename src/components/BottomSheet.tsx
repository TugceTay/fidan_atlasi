import { useEffect, useRef } from "react";
import type { Category, Entry } from "../types";
import CategoryChip from "./CategoryChip";

type SheetMode = "create" | "details";

type FormState = {
  addedByName: string;
  description: string;
  category: Category | "";
  photoPreviewUrl: string | null;
};

type BottomSheetProps = {
  mode: SheetMode;
  isOpen: boolean;
  formState: FormState;
  selectedEntry: Entry | null;
  hasDraftLocation: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  uploadStatus: string | null;
  errorMessage: string | null;
  photoWarning: string | null;
  turnstileSiteKey?: string;
  isSupabaseConfigured: boolean;
  onChange: (next: Partial<FormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  onClose: () => void;
  onDelete: () => void;
  onPhotoSelected: (file: File) => void;
  onTurnstileToken: (token: string | null) => void;
};

export default function BottomSheet({
  mode,
  isOpen,
  formState,
  selectedEntry,
  hasDraftLocation,
  isSaving,
  isDeleting,
  uploadStatus,
  errorMessage,
  photoWarning,
  turnstileSiteKey,
  isSupabaseConfigured,
  onChange,
  onSave,
  onCancel,
  onClose,
  onDelete,
  onPhotoSelected,
  onTurnstileToken,
}: BottomSheetProps) {
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || mode !== "create" || !turnstileSiteKey) return;
    if (!window.turnstile || !turnstileRef.current) return;

    if (turnstileWidgetIdRef.current) {
      window.turnstile.remove(turnstileWidgetIdRef.current);
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => onTurnstileToken(token),
      "expired-callback": () => onTurnstileToken(null),
      "error-callback": () => onTurnstileToken(null),
    });

    return () => {
      if (turnstileWidgetIdRef.current) {
        window.turnstile?.remove(turnstileWidgetIdRef.current);
      }
    };
  }, [isOpen, mode, onTurnstileToken, turnstileSiteKey]);

  if (!isOpen) return null;

  if (mode === "details" && selectedEntry) {
    const photoSrc = selectedEntry.photoUrl;
    const displayTitle =
      selectedEntry.addedByName || selectedEntry.title || "Adsız Kayıt";
    return (
      <div className="bottom-sheet" role="dialog" aria-modal="false">
        <div className="sheet__handle" />
        <div className="sheet__header">
          <div>
            <p className="sheet__eyebrow">Detay</p>
            <h2 className="sheet__title">{displayTitle}</h2>
          </div>
          <button className="sheet__close" type="button" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="sheet__content">
          <CategoryChip category={selectedEntry.category} variant="outline" />
          {selectedEntry.description && (
            <p className="sheet__text">{selectedEntry.description}</p>
          )}
          {photoSrc && (
            <div className="sheet__photo">
              <img src={photoSrc} alt={displayTitle || "Fidan"} />
            </div>
          )}
        </div>
        <div className="sheet__actions">
          <button
            className="button button--danger"
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    );
  }

  const isSaveDisabled = isSaving || !hasDraftLocation || !formState.category;

  return (
    <div className="bottom-sheet" role="dialog" aria-modal="false">
      <div className="sheet__handle" />
      <div className="sheet__header">
        <div>
          <p className="sheet__eyebrow">Yeni Nokta</p>
          <h2 className="sheet__title">Filiz Ekle</h2>
          {!hasDraftLocation && (
            <p className="sheet__hint">Haritadan bir konum seç.</p>
          )}
        </div>
        <button className="sheet__close" type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
      <div className="sheet__content sheet__content--form">
        {errorMessage && <div className="alert alert--error">{errorMessage}</div>}
        {photoWarning && <div className="alert alert--warning">{photoWarning}</div>}
        {uploadStatus && <div className="alert alert--info">{uploadStatus}</div>}
        {isSupabaseConfigured && !turnstileSiteKey && (
          <div className="alert alert--warning">
            Turnstile anahtarı bulunamadı. Lütfen VITE_TURNSTILE_SITE_KEY ayarını kontrol edin.
          </div>
        )}
        <label className="field">
          <span>Ekleyen Kim? </span>
          <input
            type="text"
            value={formState.addedByName}
            onChange={(event) => onChange({ addedByName: event.target.value })}
            placeholder="Adını yaz"
          />
        </label>
        <label className="field">
          <span>Açıklama</span>
          <textarea
            value={formState.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Kısa bir not bırak"
            rows={3}
          />
        </label>
        <div className="field">
          <span>Kategori</span>
          <div className="chip-group">
            {(["seedling", "meaningful_tree", "route"] as Category[]).map((category) => (
              <CategoryChip
                key={category}
                category={category}
                asButton
                isActive={formState.category === category}
                onClick={() => onChange({ category })}
              />
            ))}
          </div>
        </div>
        <label className="field field--file">
          <span>Fotoğraf</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPhotoSelected(file);
            }}
          />
        </label>
        {formState.photoPreviewUrl && (
          <div className="sheet__photo sheet__photo--preview">
            <img src={formState.photoPreviewUrl} alt="Seçilen fotoğraf" />
          </div>
        )}
        {turnstileSiteKey && (
          <div className="turnstile" ref={turnstileRef} />
        )}
      </div>
      <div className="sheet__actions">
        <button className="button button--ghost" type="button" onClick={onCancel}>
          İptal
        </button>
        <button
          className="button button--primary"
          type="button"
          onClick={onSave}
          disabled={isSaveDisabled}
        >
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
