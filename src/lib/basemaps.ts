import type { StyleSpecification } from "maplibre-gl";

export type BasemapStyle = string | StyleSpecification;

export type BasemapConfig = {
  id: "satellite" | "streets";
  label: string;
  style: BasemapStyle;
  thumbnail: string;
  description: string;
};

const satelliteStyleUrl = import.meta.env.VITE_BASEMAP_SAT_URL;
const streetsStyleUrl = import.meta.env.VITE_BASEMAP_STREETS_STYLE_URL;
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

const mapboxSatelliteTiles = mapboxToken
  ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.webp?access_token=${mapboxToken}`
  : undefined;
const defaultSatelliteTiles =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const defaultSatelliteLabelsTiles =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const satelliteTiles =
  import.meta.env.VITE_BASEMAP_SAT_TILE_URL ?? mapboxSatelliteTiles ?? defaultSatelliteTiles;
const satelliteLabelsTiles = import.meta.env.VITE_BASEMAP_SAT_LABELS_URL ?? defaultSatelliteLabelsTiles;
const satelliteAttribution = mapboxToken ? "© Mapbox" : "© Esri";
const streetsTiles =
  import.meta.env.VITE_BASEMAP_STREETS_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    "satellite-imagery": {
      type: "raster",
      tiles: satelliteTiles ? [satelliteTiles] : [],
      tileSize: 256,
      attribution: satelliteAttribution,
    },
    "satellite-labels": {
      type: "raster",
      tiles: satelliteLabelsTiles ? [satelliteLabelsTiles] : [],
      tileSize: 256,
      attribution: satelliteAttribution,
    },
  },
  layers: [
    {
      id: "satellite-imagery",
      type: "raster",
      source: "satellite-imagery",
    },
    {
      id: "satellite-labels",
      type: "raster",
      source: "satellite-labels",
      paint: {
        "raster-opacity": 0.85,
      },
    },
  ],
};

const streetsStyle: StyleSpecification = {
  version: 8,
  sources: {
    streets: {
      type: "raster",
      tiles: [streetsTiles],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "streets",
      type: "raster",
      source: "streets",
    },
  ],
};

export const basemaps: BasemapConfig[] = [
  {
    id: "satellite",
    label: "Uydu",
    style: satelliteStyleUrl ?? satelliteStyle,
    thumbnail:
      "linear-gradient(135deg, rgba(30, 59, 26, 0.9), rgba(79, 132, 86, 0.85), rgba(188, 210, 168, 0.9))",
    description: "Mapbox/MapLibre uydu görünümü",
  },
  {
    id: "streets",
    label: "Sokaklar",
    style: streetsStyleUrl ?? streetsStyle,
    thumbnail:
      "linear-gradient(135deg, rgba(224, 232, 217, 0.95), rgba(173, 198, 188, 0.9), rgba(122, 158, 164, 0.85))",
    description: "Adresler ve etiketler",
  },
];

export const defaultBasemapId: BasemapConfig["id"] = "satellite";

export function resolveBasemapId(value: string | null): BasemapConfig["id"] {
  if (!value) return defaultBasemapId;
  return basemaps.some((basemap) => basemap.id === value) ? (value as BasemapConfig["id"]) : defaultBasemapId;
}

export function getBasemapById(id: BasemapConfig["id"]): BasemapConfig {
  return basemaps.find((basemap) => basemap.id === id) ?? basemaps[0];
}
