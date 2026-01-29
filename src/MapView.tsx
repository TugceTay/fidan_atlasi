import { useEffect, useMemo, useRef, useState } from "react";
import type { SourceSpecification } from "@maplibre/maplibre-gl-style-spec";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import type { Bounds, Entry } from "./types";

type MapViewProps = {
  entries: Entry[];
  draftLocation: { lng: number; lat: number } | null;
  selectedEntryId: string | null;
  searchLocation: { lng: number; lat: number } | null;
  basemapStyle: string | StyleSpecification;
  onMapClick: (location: { lng: number; lat: number }) => void;
  onMarkerClick: (entryId: string) => void;
  onBoundsChange?: (bounds: Bounds) => void;
};

const seedIconSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#2E4A3B" d="M24 42c8-8 13-14 13-21a13 13 0 1 0-26 0c0 7 5 13 13 21z"/>
    <path fill="#A7BFA7" d="M24 13c4-4 10-3 12 2-4 1-8 4-12 7-4-3-8-6-12-7 2-5 8-6 12-2z"/>
    <circle fill="#F4F0E6" cx="24" cy="24" r="4"/>
  </svg>
`)}`;


class RitualControl implements maplibregl.IControl {
  private container?: HTMLDivElement;

  onAdd(map: maplibregl.Map) {
    const container = document.createElement("div");
    container.className = "map-ritual-control";

    const handleControlClick =
      (action: () => void) =>
      (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      };

    const zoomIn = document.createElement("button");
    zoomIn.type = "button";
    zoomIn.className = "map-ritual-control__button";
    zoomIn.setAttribute("aria-label", "Yakınlaştır");
    zoomIn.textContent = "+";
    zoomIn.addEventListener("click", handleControlClick(() => map.zoomIn()));

    const zoomOut = document.createElement("button");
    zoomOut.type = "button";
    zoomOut.className = "map-ritual-control__button";
    zoomOut.setAttribute("aria-label", "Uzaklaştır");
    zoomOut.textContent = "–";
    zoomOut.addEventListener("click", handleControlClick(() => map.zoomOut()));

    const compass = document.createElement("button");
    compass.type = "button";
    compass.className = "map-ritual-control__button map-ritual-control__button--compass";
    compass.setAttribute("aria-label", "Pusulayı sıfırla");
    compass.textContent = "⟲";
    compass.addEventListener(
      "click",
      handleControlClick(() => {
        map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
      })
    );

    const locate = document.createElement("button");
    locate.type = "button";
    locate.className = "map-ritual-control__button map-ritual-control__button--locate";
    locate.setAttribute("aria-label", "Konumuma git");
    locate.textContent = "⦿";
    locate.addEventListener(
      "click",
      handleControlClick(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((position) => {
          map.easeTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 12,
            duration: 1200,
          });
        });
      })
    );

    container.append(zoomIn, zoomOut, compass, locate);
    this.container = container;
    return container;
  }

  onRemove() {
    this.container?.remove();
  }
}

export default function MapView({
  entries,
  draftLocation,
  selectedEntryId,
  searchLocation,
  basemapStyle,
  onMapClick,
  onMarkerClick,
  onBoundsChange,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const boundsTimerRef = useRef<number | null>(null);
  const currentStyleRef = useRef(basemapStyle);
  const [isStyleLoading, setIsStyleLoading] = useState(true);
  const pulseFrameRef = useRef<number | null>(null);
  const entriesDataRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const draftDataRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const selectedDataRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const searchDataRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const onMapClickRef = useRef(onMapClick);
  const onMarkerClickRef = useRef(onMarkerClick);

  const entriesGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: entries.map((entry) => ({
        type: "Feature",
        properties: {
          id: entry.id,
          category: entry.category,
        },
        geometry: {
          type: "Point",
          coordinates: [entry.lng, entry.lat],
        },
      })),
    }),
    [entries]
  );

  const selectedGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    const selected = entries.find((entry) => entry.id === selectedEntryId);
    if (!selected) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [selected.lng, selected.lat],
          },
        },
      ],
    };
  }, [entries, selectedEntryId]);

  const draftGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () =>
      draftLocation
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [draftLocation.lng, draftLocation.lat],
                },
              },
            ],
          }
        : { type: "FeatureCollection", features: [] },
    [draftLocation]
  );

  const searchGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () =>
      searchLocation
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [searchLocation.lng, searchLocation.lat],
                },
              },
            ],
          }
        : { type: "FeatureCollection", features: [] },
    [searchLocation]
  );

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    entriesDataRef.current = entriesGeoJson;
  }, [entriesGeoJson]);

  useEffect(() => {
    draftDataRef.current = draftGeoJson;
  }, [draftGeoJson]);

  useEffect(() => {
    selectedDataRef.current = selectedGeoJson;
  }, [selectedGeoJson]);

  useEffect(() => {
    searchDataRef.current = searchGeoJson;
  }, [searchGeoJson]);

  const applyPulseAnimation = (map: maplibregl.Map) => {
    if (pulseFrameRef.current) {
      cancelAnimationFrame(pulseFrameRef.current);
    }

    const tick = (time: number) => {
      if (map.getLayer("selected-pulse")) {
        const radius = 18 + 6 * Math.sin(time / 650);
        const opacity = 0.45 + 0.15 * Math.cos(time / 700);
        map.setPaintProperty("selected-pulse", "circle-radius", radius);
        map.setPaintProperty("selected-pulse", "circle-opacity", opacity);
      }
      pulseFrameRef.current = requestAnimationFrame(tick);
    };

    pulseFrameRef.current = requestAnimationFrame(tick);
  };

  const ensureSeedIconLayer = (map: maplibregl.Map) => {
    if (!map.hasImage("seed-icon")) return;
    if (!map.getSource("entries")) return;
    if (map.getLayer("unclustered-icon")) return;
    map.addLayer({
      id: "unclustered-icon",
      type: "symbol",
      source: "entries",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": "seed-icon",
        "icon-size": 0.55,
        "icon-allow-overlap": true,
      },
    });
  };

  const loadImageP = (map: maplibregl.Map, url: string) => {
    const loadImage = map.loadImage.bind(map) as (
      ...args: unknown[]
    ) => unknown;

    const handleImage = (result: unknown) => {
      const image = (result as { data?: unknown })?.data ?? result;
      if (!image) {
        throw new Error("MapLibre loadImage returned empty image");
      }
      return image;
    };

    if (loadImage.length >= 2) {
      return new Promise<unknown>((resolve, reject) => {
        (loadImage as unknown as (imageUrl: string, cb: (error: Error | null, image: unknown) => void) => void)(
          url,
          (error, image) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(handleImage(image));
          }
        );
      });
    }

    return Promise.resolve((loadImage as unknown as (imageUrl: string) => unknown)(url)).then(handleImage);
  };

  const addOverlayImages = (map: maplibregl.Map) => {
    if (map.hasImage("seed-icon")) {
      ensureSeedIconLayer(map);
      return;
    }

    console.info("[MapView] overlay image load start", { id: "seed-icon" });
    void loadImageP(map, seedIconSvg)
      .then((image) => {
        if (!map.hasImage("seed-icon")) {
          map.addImage("seed-icon", image as never);
          console.info("[MapView] overlay image added", { id: "seed-icon" });
        }
      })
      .catch((error) => {
        console.warn("[MapView] overlay image load failed", { id: "seed-icon", error });
      })
      .finally(() => {
        ensureSeedIconLayer(map);
      });
  };

const addSourceIfMissing = (map: maplibregl.Map, id: string, source: SourceSpecification) => {
    if (map.getSource(id)) return;
    try {
      map.addSource(id, source);
      console.info("[MapView] source added", { id });
    } catch (error) {
      console.warn("[MapView] source add failed", { id, error });
    }
  };

  const addLayerIfMissing = (map: maplibregl.Map, layer: maplibregl.LayerSpecification) => {
    if (map.getLayer(layer.id)) return;
    try {
      map.addLayer(layer);
      console.info("[MapView] layer added", { id: layer.id });
    } catch (error) {
      console.warn("[MapView] layer add failed", { id: layer.id, error });
    }
  };

  const addSourcesAndLayers = (map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) {
      console.warn("[MapView] style not ready; skip addSourcesAndLayers");
      return;
    }

    addSourceIfMissing(map, "entries", {
      type: "geojson",
      data: entriesDataRef.current,
      cluster: true,
      clusterRadius: 56,
      clusterMaxZoom: 13,
    });

    addSourceIfMissing(map, "draft-location", {
      type: "geojson",
      data: draftDataRef.current,
    });

    addSourceIfMissing(map, "selected-location", {
      type: "geojson",
      data: selectedDataRef.current,
    });

    addSourceIfMissing(map, "search-location", {
      type: "geojson",
      data: searchDataRef.current,
    });

    addOverlayImages(map);

    addLayerIfMissing(map, {
      id: "cluster-glow",
      type: "circle",
      source: "entries",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#A7BFA7",
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 30, 34],
        "circle-opacity": 0.25,
        "circle-blur": 0.8,
      },
    });

    addLayerIfMissing(map, {
      id: "cluster-circles",
      type: "circle",
      source: "entries",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#BBD2B4", 10, "#9ABF96", 30, "#7B9F7B"],
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 30],
        "circle-stroke-color": "rgba(244,240,230,0.9)",
        "circle-stroke-width": 1.5,
      },
    });

    addLayerIfMissing(map, {
      id: "cluster-count",
      type: "symbol",
      source: "entries",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#2E4A3B",
      },
    });

    addLayerIfMissing(map, {
      id: "unclustered-point",
      type: "circle",
      source: "entries",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#2E4A3B",
        "circle-radius": 8,
        "circle-stroke-color": "#F4F0E6",
        "circle-stroke-width": 2,
      },
    });

    addLayerIfMissing(map, {
      id: "selected-pulse",
      type: "circle",
      source: "selected-location",
      paint: {
        "circle-color": "#A7BFA7",
        "circle-radius": 18,
        "circle-opacity": 0.45,
        "circle-blur": 0.8,
      },
    });

    addLayerIfMissing(map, {
      id: "selected-core",
      type: "circle",
      source: "selected-location",
      paint: {
        "circle-color": "#2E4A3B",
        "circle-radius": 6,
        "circle-stroke-color": "#F4F0E6",
        "circle-stroke-width": 2,
      },
    });

    addLayerIfMissing(map, {
      id: "draft-core",
      type: "circle",
      source: "draft-location",
      paint: {
        "circle-color": "#AFD6DC",
        "circle-radius": 7,
        "circle-stroke-color": "#F4F0E6",
        "circle-stroke-width": 2,
      },
    });

    addLayerIfMissing(map, {
      id: "draft-halo",
      type: "circle",
      source: "draft-location",
      paint: {
        "circle-color": "#AFD6DC",
        "circle-radius": 14,
        "circle-opacity": 0.25,
        "circle-blur": 0.8,
      },
    });

    addLayerIfMissing(map, {
      id: "search-halo",
      type: "circle",
      source: "search-location",
      paint: {
        "circle-color": "#B9D7D2",
        "circle-radius": 16,
        "circle-opacity": 0.35,
        "circle-blur": 0.7,
      },
    });

    addLayerIfMissing(map, {
      id: "search-core",
      type: "circle",
      source: "search-location",
      paint: {
        "circle-color": "#2E4A3B",
        "circle-radius": 6,
        "circle-stroke-color": "#F4F0E6",
        "circle-stroke-width": 2,
      },
    });

  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: basemapStyle,
      center: [32.8597, 39.9334], // Ankara (başlangıç)
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new RitualControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("click", (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ["cluster-circles", "unclustered-point"],
      });
      if (features.length > 0) return;
      onMapClickRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    const handleBoundsUpdate = () => {
      if (!onBoundsChange) return;
      if (boundsTimerRef.current) {
        window.clearTimeout(boundsTimerRef.current);
      }
      boundsTimerRef.current = window.setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange({
          minLng: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLng: bounds.getEast(),
          maxLat: bounds.getNorth(),
        });
      }, 300);
    };

    const handleStyleLoad = () => {
      console.info("[MapView] style loaded");
      setIsStyleLoading(false);
      addSourcesAndLayers(map);
      applyPulseAnimation(map);
    };

    map.once("load", () => {
      console.info("[MapView] map loaded");
      handleBoundsUpdate();
      addSourcesAndLayers(map);
      applyPulseAnimation(map);
    });
    map.on("moveend", handleBoundsUpdate);
    map.on("style.load", handleStyleLoad);

    map.on("click", "cluster-circles", (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["cluster-circles"] });
      const cluster = features[0];
      if (!cluster) return;
      const source = map.getSource("entries") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const clusterIdRaw = cluster.properties?.cluster_id as unknown;
      const clusterIdNum = typeof clusterIdRaw === "number" ? clusterIdRaw : Number(clusterIdRaw);
      if (!Number.isFinite(clusterIdNum)) return;

      const getZoom = (source as unknown as { getClusterExpansionZoom: (...args: unknown[]) => unknown })
        .getClusterExpansionZoom;

      const handleZoom = (zoomValue: unknown) => {
        const zoom = typeof zoomValue === "number" ? zoomValue : Number(zoomValue);
        if (!Number.isFinite(zoom)) return;
        const [lng, lat] = (cluster.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: [lng, lat], zoom, duration: 800 });
      };

      // Callback tabanlı sürümler genelde 2 parametre tanımlar (clusterId, cb).
      if (getZoom.length >= 2) {
        (getZoom as unknown as (id: number, cb: (error: Error | null, zoom: number | null) => void) => void)(
          clusterIdNum,
          (error, zoom) => {
            if (error || zoom === null) return;
            handleZoom(zoom);
          }
        );
        return;
      }

      // Promise tabanlı sürümler
      void Promise.resolve((getZoom as unknown as (id: number) => unknown)(clusterIdNum))
        .then(handleZoom)
        .catch(() => undefined);
    });

    map.on("click", "unclustered-point", (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!id) return;
      onMarkerClickRef.current(id);
    });

    map.on("mouseenter", "unclustered-point", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "unclustered-point", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "cluster-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "cluster-circles", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      if (boundsTimerRef.current) {
        window.clearTimeout(boundsTimerRef.current);
      }
      map.off("style.load", handleStyleLoad);
      map.remove();
      mapRef.current = null;
      if (pulseFrameRef.current) {
        cancelAnimationFrame(pulseFrameRef.current);
      }
    };
  }, [basemapStyle, onBoundsChange, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentStyleRef.current === basemapStyle) return;
    currentStyleRef.current = basemapStyle;
    setIsStyleLoading(true);
    map.setStyle(basemapStyle);
  }, [basemapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("entries") as maplibregl.GeoJSONSource | undefined;
    source?.setData(entriesGeoJson);
  }, [entriesGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("draft-location") as maplibregl.GeoJSONSource | undefined;
    source?.setData(draftGeoJson);
  }, [draftLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("selected-location") as maplibregl.GeoJSONSource | undefined;
    source?.setData(selectedGeoJson);
  }, [selectedGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("search-location") as maplibregl.GeoJSONSource | undefined;
    source?.setData(searchGeoJson);
  }, [searchGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchLocation) return;
    map.easeTo({
      center: [searchLocation.lng, searchLocation.lat],
      zoom: Math.max(map.getZoom(), 12),
      duration: 1000,
    });
  }, [searchLocation]);

  return (
    <div className={`map-shell ${isStyleLoading ? "map-shell--loading" : ""}`}>
      <div ref={mapContainerRef} className="map-container" />
      <div
        className={`map-style-indicator ${isStyleLoading ? "map-style-indicator--visible" : ""}`}
        aria-live="polite"
      >
        Harita yükleniyor…
      </div>
    </div>
  );
}
