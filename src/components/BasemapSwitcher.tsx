import { useEffect, useId, useRef, useState } from "react";
import type { BasemapConfig } from "../lib/basemaps";

type BasemapSwitcherProps = {
  basemaps: BasemapConfig[];
  currentBasemapId: BasemapConfig["id"];
  onChange: (basemapId: BasemapConfig["id"]) => void;
  position?: "right-center" | "right-bottom";
};

export default function BasemapSwitcher({
  basemaps,
  currentBasemapId,
  onChange,
  position = "right-bottom",
}: BasemapSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={`map-orbit map-orbit--${position}`}>
      <button
        type="button"
        className="map-orbit__trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="map-orbit__icon" aria-hidden="true">
          ✦
        </span>
        <span className="map-orbit__label">Harita</span>
      </button>

      <div
        id={panelId}
        className={`map-orbit__panel ${isOpen ? "map-orbit__panel--open" : ""}`}
        role="menu"
        aria-hidden={!isOpen}
      >
        <div className="map-orbit__header">
          <div>
            <p className="map-orbit__title">Manzara Modu</p>
          </div>
          <button type="button" className="map-orbit__close" onClick={() => setIsOpen(false)}>
            Kapat
          </button>
        </div>
        <div className="map-orbit__section">
          <p className="map-orbit__section-title">Tema geçişi</p>
          <div className="map-orbit__options">
            {basemaps.map((basemap) => {
              const isActive = basemap.id === currentBasemapId;
              return (
                <button
                  key={basemap.id}
                  type="button"
                  className={`map-orbit__option ${isActive ? "map-orbit__option--active" : ""}`}
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onChange(basemap.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="map-orbit__thumb" style={{ background: basemap.thumbnail }} />
                  <span className="map-orbit__text">
                    <span className="map-orbit__label">{basemap.label}</span>
                    <span className="map-orbit__desc">{basemap.description}</span>
                  </span>
                  <span className="map-orbit__check" aria-hidden="true">
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
