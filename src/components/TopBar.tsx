import { useEffect, useId, useRef, useState } from "react";
import type { FocusFilter } from "../types";

type FilterValue = FocusFilter;

type TopBarProps = {
  filter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
  onExplore: () => void;
  onAdd: () => void;
  onSearchSelect: (location: { lng: number; lat: number; label: string }) => void;
};

const filterOptions: Array<{ value: FilterValue; label: string }> = [
  { value: "seedlings", label: "Yeni Filizler" },
  { value: "monument_trees", label: "Anıt Ağaçlar" },
  { value: "route", label: "Fidan Rotası" },
];

const filterLabels = Object.fromEntries(filterOptions.map(({ value, label }) => [value, label])) as Record<
  FilterValue,
  string
>;

type NominatimResult = {
  place_id?: number | string;
  osm_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
  };
};

export default function TopBar({ filter, onFilterChange, onExplore, onAdd, onSearchSelect }: TopBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; label: string; meta: string; lat: number; lng: number }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const panelId = useId();
  const searchId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      requestIdRef.current += 1;
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "5");
      url.searchParams.set("q", searchQuery.trim());

      fetch(url.toString(), {
        headers: {
          "Accept-Language": "tr",
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Adres araması başarısız oldu.");
          return response.json();
        })
        .then((data: NominatimResult[]) => {
          if (requestIdRef.current !== requestId) return;
          const nextResults = data.map((item) => {
            const addressParts = [
              item.address?.neighbourhood,
              item.address?.suburb,
              item.address?.city || item.address?.town || item.address?.county,
              item.address?.state,
            ].filter(Boolean);
            return {
              id: String(item.place_id ?? item.osm_id ?? item.display_name),
              label: item.display_name ?? "Bilinmeyen adres",
              meta: addressParts.join(" · "),
              lat: Number(item.lat),
              lng: Number(item.lon),
            };
          });
          setSearchResults(nextResults.filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng)));
          setIsSearching(false);
        })
        .catch((error: Error) => {
          if (requestIdRef.current !== requestId) return;
          setSearchError(error.message);
          setSearchResults([]);
          setIsSearching(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isFilterOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  return (
    <div className="map-dock" role="navigation">
      <div className="map-dock__header">
        <div>
          <h2 className="map-dock__title">Yeşil Rota</h2>
        </div>
        <div className="map-dock__halo" aria-hidden="true" />
      </div>
      <div className="map-dock__search">
        <label className="map-dock__search-label" htmlFor={searchId}>
          Adres ara
        </label>
        <div className="map-dock__search-field">
          <span className="map-dock__search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            id={searchId}
            className="map-dock__search-input"
            type="search"
            placeholder="Mahalle, cadde veya önemli bir yer"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-describedby={`${searchId}-hint`}
          />
          {searchQuery && (
            <button
              className="map-dock__search-clear"
              type="button"
              aria-label="Arama metnini temizle"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
        <p id={`${searchId}-hint`} className="map-dock__search-hint">
          En az 3 karakter girerek aramayı başlatabilirsiniz.
        </p>
        {(isSearching || searchError || searchResults.length > 0 || searchQuery.trim().length >= 3) && (
          <div className="map-dock__search-results" aria-live="polite">
            {isSearching && <div className="map-dock__search-state">Adresler aranıyor…</div>}
            {!isSearching && searchError && <div className="map-dock__search-state">{searchError}</div>}
            {!isSearching && !searchError && searchResults.length === 0 && (
              <div className="map-dock__search-state">Sonuç bulunamadı.</div>
            )}
            {!isSearching &&
              !searchError &&
              searchResults.map((result) => (
                <button
                  key={result.id}
                  className="map-dock__search-item"
                  type="button"
                  onClick={() => {
                    onSearchSelect({ lng: result.lng, lat: result.lat, label: result.label });
                    setSearchQuery(result.label);
                    setSearchResults([]);
                  }}
                >
                  <span className="map-dock__search-item-title">{result.label}</span>
                  {result.meta && <span className="map-dock__search-item-meta">{result.meta}</span>}
                </button>
              ))}
          </div>
        )}
      </div>
      <div className="map-dock__actions">
        <button className="map-dock__action map-dock__action--explore" type="button" onClick={onExplore}>
          Keşfet
        </button>
        <button className="map-dock__action map-dock__action--add" type="button" onClick={onAdd}>
          Yeni Filiz
        </button>
      </div>
      <div ref={wrapperRef} className="map-dock__filter">
        <button
          className="map-dock__filter-toggle"
          type="button"
          onClick={() => setIsFilterOpen((open) => !open)}
          aria-expanded={isFilterOpen}
          aria-controls={panelId}
        >
          Odak: {filterLabels[filter]}
        </button>
        {isFilterOpen && (
          <div id={panelId} className="map-dock__filter-panel" role="menu">
            {filterOptions.map(({ value, label }) => (
              <button
                key={value}
                className={`map-dock__filter-chip ${filter === value ? "map-dock__filter-chip--active" : ""}`}
                type="button"
                role="menuitemradio"
                aria-checked={filter === value}
                onClick={() => {
                  onFilterChange(value);
                  setIsFilterOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
