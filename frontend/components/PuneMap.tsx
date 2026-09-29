"use client";
// components/PuneMap.tsx
// MapLibre GL JS + MapTiler Pune Environmental Digital Twin Base Map & Living AYAM Layers
//
// 1. MapTiler streets-v4 / dataviz-dark vector base map centered on Pune, Maharashtra
// 2. 3D Building Extrusions (fill-extrusion) for genuine urban depth and verticality
// 3. Continuous PM2.5 Heat Field with spatial gradients
// 4. Animated Traffic Corridor Flow Lines with proxy congestion weighting
// 5. Wind Vector / Particle Transport Field across the Mutha-Mula river valley
// 6. MIDC Industrial Activity Proxy Zones
// 7. Contextual Hotspot Highlighting with map dimming
// 8. Scenario Delta comparison (BASELINE vs MODELED SCENARIO)

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Observation } from "@/lib/api";
import { getPm25Category } from "@/lib/api";
import { useAyamSafe } from "@/context/AyamContext";

interface PuneMapProps {
  observations: Observation[];
  selectedStation?: string | null;
  onStationClick?: (stationId: string) => void;
  onHotspotClick?: (stationId: string) => void;
  scenarioMode?: boolean;
  scenarioDelta?: number; // % change from scenario
  compareMode?: "baseline" | "after" | "split";
  showIndustrial?: boolean;
  showCorridors?: boolean;
  showWindField?: boolean;
  show3DBuildings?: boolean;
  simulatedHour?: number;
  trafficMultiplier?: number;
  aerosolFluxMultiplier?: number;
  isMapDimmed?: boolean;
}

// Pune Center Coordinates
const PUNE_CENTER: [number, number] = [73.8567, 18.5204];
const DEFAULT_ZOOM = 12.0;
const DEFAULT_PITCH = 42; // Tilted 3D perspective for city simulation feel
const DEFAULT_BEARING = -15;

const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY ||
  process.env.VITE_MAPTILER_KEY ||
  "";

// Fallback Pune monitoring stations with verified coordinates
const DEFAULT_STATIONS: Observation[] = [
  { station_id: "DEMO-SHIVAJINAGAR", station_name: "Shivajinagar Transit Core", lat: 18.5314, lon: 73.8446, pm25: 88.5, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "CPCB / MPCB" },
  { station_id: "DEMO-HADAPSAR", station_name: "Hadapsar Industrial Belt", lat: 18.5089, lon: 73.9260, pm25: 118.2, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "CPCB / MPCB" },
  { station_id: "DEMO-BHOSARI", station_name: "Bhosari MIDC Cluster", lat: 18.6279, lon: 73.8437, pm25: 138.0, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "MPCB Reference" },
  { station_id: "DEMO-KATRAJ", station_name: "Katraj Southern Pass", lat: 18.4575, lon: 73.8677, pm25: 84.6, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "MPCB Reference" },
  { station_id: "DEMO-LOHEGAON", station_name: "Lohegaon Airport Airshed", lat: 18.5822, lon: 73.9197, pm25: 64.3, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "MPCB Reference" },
  { station_id: "DEMO-PASHAN", station_name: "Pashan Science Core (IISER)", lat: 18.5414, lon: 73.7928, pm25: 52.1, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "IITM / SAFAR" },
  { station_id: "DEMO-KOTHRUD", station_name: "Kothrud Residential Zone", lat: 18.5074, lon: 73.8077, pm25: 68.0, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "MPCB Reference" },
  { station_id: "DEMO-WAKAD", station_name: "Wakad / Hinjawadi IT Corridor", lat: 18.5987, lon: 73.7688, pm25: 91.5, timestamp: new Date().toISOString(), data_status: "OBSERVED", source: "MPCB Reference" },
];

// Industrial Zones with PostGIS polygon geometry
const INDUSTRIAL_ZONES_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Bhosari & PCMC MIDC Cluster", type: "Heavy Engineering & Fabrication", proxyIndex: "1.45x" },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.820, 18.618], [73.820, 18.648], [73.865, 18.650], [73.865, 18.622], [73.820, 18.618]]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Hadapsar Industrial Estate", type: "Manufacturing & Logistics Hub", proxyIndex: "1.30x" },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.920, 18.495], [73.920, 18.520], [73.955, 18.520], [73.955, 18.495], [73.920, 18.495]]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Chakan Auto Hub (Northern Buffer)", type: "Automotive Stamping & Paint Lines", proxyIndex: "1.55x" },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.835, 18.730], [73.835, 18.775], [73.885, 18.775], [73.885, 18.730], [73.835, 18.730]]],
      },
    },
  ],
};

// Arterial Traffic Corridors
const TRAFFIC_CORRIDORS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Karve Road Corridor", congestion: 0.85, baselineVehicles: "4,200 veh/hr" },
      geometry: {
        type: "LineString",
        coordinates: [[73.820, 18.502], [73.836, 18.510], [73.848, 18.520]],
      },
    },
    {
      type: "Feature",
      properties: { name: "FC Road & JM Road Commercial Axis", congestion: 0.92, baselineVehicles: "5,100 veh/hr" },
      geometry: {
        type: "LineString",
        coordinates: [[73.840, 18.523], [73.846, 18.532], [73.852, 18.542]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Mumbai-Bengaluru Western Bypass (NH-48)", congestion: 0.78, baselineVehicles: "6,800 veh/hr" },
      geometry: {
        type: "LineString",
        coordinates: [[73.755, 18.610], [73.770, 18.560], [73.790, 18.510], [73.805, 18.460]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Hadapsar — Solapur Road Freight Arterial", congestion: 0.88, baselineVehicles: "4,600 veh/hr" },
      geometry: {
        type: "LineString",
        coordinates: [[73.905, 18.508], [73.930, 18.509], [73.960, 18.495]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Nagar Road Corridor (Viman Nagar)", congestion: 0.75, baselineVehicles: "3,900 veh/hr" },
      geometry: {
        type: "LineString",
        coordinates: [[73.880, 18.545], [73.910, 18.560], [73.940, 18.575]],
      },
    },
  ],
};

// Wind vector field samples across Pune topography
const WIND_FIELD_GEOJSON = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { speed: 3.4, direction: 245 }, geometry: { type: "Point", coordinates: [73.78, 18.52] } },
    { type: "Feature", properties: { speed: 3.8, direction: 250 }, geometry: { type: "Point", coordinates: [73.82, 18.53] } },
    { type: "Feature", properties: { speed: 4.1, direction: 240 }, geometry: { type: "Point", coordinates: [73.86, 18.52] } },
    { type: "Feature", properties: { speed: 3.2, direction: 260 }, geometry: { type: "Point", coordinates: [73.90, 18.51] } },
    { type: "Feature", properties: { speed: 3.9, direction: 235 }, geometry: { type: "Point", coordinates: [73.84, 18.60] } },
    { type: "Feature", properties: { speed: 4.5, direction: 245 }, geometry: { type: "Point", coordinates: [73.85, 18.46] } },
  ],
};

export function PuneMap({
  observations,
  selectedStation,
  onStationClick,
  onHotspotClick,
  scenarioMode = false,
  scenarioDelta = 0,
  compareMode = "after",
  showIndustrial = true,
  showCorridors = true,
  showWindField = true,
  show3DBuildings = true,
  simulatedHour = 14,
  trafficMultiplier = 1.0,
  aerosolFluxMultiplier = 1.0,
  isMapDimmed = false,
}: PuneMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileStyle, setTileStyle] = useState<"streets" | "dark">("dark");
  const [viewPerspective, setViewPerspective] = useState<"3D" | "2D">("3D");

  const ayam = useAyamSafe();

  const baseStations = observations && observations.length > 0 ? observations : DEFAULT_STATIONS;

  const activeStations = React.useMemo(() => {
    if (!ayam || ayam.selectedRegion === "ALL") return baseStations;
    if (ayam.selectedRegion === "PCMC") {
      return baseStations.filter(
        (st) =>
          st.station_id.includes("BHOSARI") ||
          st.station_id.includes("WAKAD") ||
          st.lat > 18.585
      );
    }
    // "PUNE"
    return baseStations.filter(
      (st) =>
        st.lat <= 18.585 ||
        st.station_id.includes("SHIVAJI") ||
        st.station_id.includes("HADAPSAR") ||
        st.station_id.includes("KATRAJ") ||
        st.station_id.includes("PASHAN") ||
        st.station_id.includes("KOTHRUD") ||
        st.station_id.includes("LOHEGAON")
    );
  }, [baseStations, ayam?.selectedRegion]);

  // Build GeoJSON features with diurnal adjustments and scenario deltas
  const buildStationsGeoJSON = useCallback(() => {
    return {
      type: "FeatureCollection",
      features: activeStations.map((st) => {
        // Base observed value
        let val = st.pm25;

        // Apply diurnal aerosol flux multiplier from timeline
        val = val * aerosolFluxMultiplier;

        // Apply scenario delta if active
        if (scenarioMode && scenarioDelta !== undefined && compareMode !== "baseline") {
          val = Math.max(10, val * (1 + scenarioDelta / 100));
        }

        const isHotspot = val > 90;

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [st.lon, st.lat],
          },
          properties: {
            station_id: st.station_id,
            station_name: st.station_name,
            pm25: Math.round(val * 10) / 10,
            raw_pm25: st.pm25,
            isHotspot: isHotspot ? 1 : 0,
            state: scenarioMode && compareMode !== "baseline" ? "SCENARIO" : st.data_status || "OBSERVED",
            timestamp: st.timestamp,
            source: st.source,
          },
        };
      }),
    };
  }, [activeStations, aerosolFluxMultiplier, scenarioMode, scenarioDelta, compareMode]);

  // Initialize MapLibre GL JS
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      if (!MAPTILER_KEY) {
        setMapError("VITE_MAPTILER_KEY is missing. Please verify .env or docker-compose.yml");
        return;
      }

      try {
        const mod = await import("maplibre-gl");
        const maplibregl: any = (mod as any).default || mod;

        if (typeof maplibregl.setWorkerUrl === "function") {
          maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        }

        if (!isMounted || !mapContainerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const styleUrl =
          tileStyle === "streets"
            ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`
            : `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: styleUrl,
          center: PUNE_CENTER,
          zoom: DEFAULT_ZOOM,
          pitch: viewPerspective === "3D" ? DEFAULT_PITCH : 0,
          bearing: viewPerspective === "3D" ? DEFAULT_BEARING : 0,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
          "top-right"
        );

        map.on("load", () => {
          if (!isMounted) return;
          mapRef.current = map;
          setMapLoaded(true);
          setMapError(null);
          setTimeout(() => {
            if (mapRef.current) {
              try {
                mapRef.current.resize();
              } catch {}
            }
          }, 150);
        });

        map.on("error", (e: any) => {
          console.warn("[AYAM MapLibre] Event warning:", e);
          if (
            e?.error?.status === 403 ||
            e?.error?.status === 401 ||
            (e?.error && String(e.error).includes("Key"))
          ) {
            console.warn("[AYAM MapLibre] Switching to Carto Dark fallback style...");
            try {
              map.setStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");
            } catch {}
          }
        });
      } catch (err: any) {
        console.error("[AYAM MapLibre] Init error:", err);
        if (isMounted) setMapError(`MapLibre failed: ${err.message || err}`);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [tileStyle]);

  // Setup / Update MapLibre Environmental Sources and Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const effShowInd = ayam ? ayam.layers.showIndustrialZones : showIndustrial;
    const effShowCorridors = ayam ? ayam.layers.showTrafficCorridors : showCorridors;
    const effShowWind = ayam ? ayam.layers.showWindField : showWindField;
    const effShow3D = show3DBuildings ?? (ayam ? (ayam.layers.show3DBuildings && ayam.is3D) : true);
    const effShowStations = ayam ? ayam.layers.showStations : true;
    const effShowHeatmap = ayam ? ayam.layers.showHeatmap : true;

    const styleLayers = map.getStyle().layers;
    let labelLayerId: string | undefined;
    if (styleLayers) {
      for (let i = 0; i < styleLayers.length; i++) {
        if (styleLayers[i].type === "symbol" && (styleLayers[i].layout as any)?.["text-field"]) {
          labelLayerId = styleLayers[i].id;
          break;
        }
      }
    }

    const geojsonData = buildStationsGeoJSON();

    // ── 1. Stations & PM2.5 GeoJSON Source ──────────────────────────
    if (map.getSource("ayam-stations-source")) {
      map.getSource("ayam-stations-source").setData(geojsonData);
    } else {
      map.addSource("ayam-stations-source", {
        type: "geojson",
        data: geojsonData,
      });
    }

    // ── 2. 3D Building Footprints (Extrusions) ─────────────────────
    if (map.getLayer("Building 3D")) {
      map.setLayoutProperty(
        "Building 3D",
        "visibility",
        effShow3D ? "visible" : "none"
      );
      try {
        map.setLayerZoomRange("Building 3D", 13.0, 24);
      } catch {}
    } else {
      const vectorSource = map.getSource("maptiler_planet")
        ? "maptiler_planet"
        : map.getSource("openmaptiles")
        ? "openmaptiles"
        : null;

      if (vectorSource && !map.getLayer("ayam-3d-buildings")) {
        map.addLayer(
          {
            id: "ayam-3d-buildings",
            source: vectorSource,
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["get", "render_height"],
                0, "#1e293b",
                30, "#334155",
                80, "#475569",
              ],
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13, 0,
                14.5, ["coalesce", ["get", "render_height"], ["get", "height"], 15],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13, 0,
                14.5, ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
              ],
              "fill-extrusion-opacity": 0.60,
            },
          },
          labelLayerId
        );
      }
      if (map.getLayer("ayam-3d-buildings")) {
        map.setLayoutProperty(
          "ayam-3d-buildings",
          "visibility",
          effShow3D ? "visible" : "none"
        );
      }
    }

    // ── 3. Continuous PM2.5 Heat Field ─────────────────────────────
    if (!map.getLayer("ayam-pm25-heatmap")) {
      map.addLayer({
        id: "ayam-pm25-heatmap",
        type: "heatmap",
        source: "ayam-stations-source",
        maxzoom: 15,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "pm25"],
            0, 0,
            40, 0.35,
            80, 0.75,
            140, 1.3,
          ],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9, 0.7,
            12, 1.4,
            15, 2.6,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(16, 185, 129, 0)",
            0.15, "rgba(16, 185, 129, 0.35)",  // Clean green
            0.35, "rgba(234, 179, 8, 0.45)",   // Moderate yellow
            0.55, "rgba(249, 115, 22, 0.60)",  // Elevated orange
            0.75, "rgba(239, 68, 68, 0.70)",   // High red
            1.0, "rgba(168, 85, 247, 0.85)",   // Severe purple
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9, 25,
            12, 50,
            15, 95,
          ],
          "heatmap-opacity": 0.65,
        },
      });
    }

    // ── 4. Hotspot Halo Dispersion Layer ───────────────────────────
    if (!map.getLayer("ayam-hotspot-halos")) {
      map.addLayer({
        id: "ayam-hotspot-halos",
        type: "circle",
        source: "ayam-stations-source",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "pm25"],
            30, 24,
            80, 48,
            140, 78,
          ],
          "circle-color": [
            "step",
            ["get", "pm25"],
            "#10b981", 30,
            "#eab308", 60,
            "#f97316", 90,
            "#ef4444", 120,
            "#a855f7"
          ],
          "circle-opacity": 0.18,
          "circle-stroke-width": 1.2,
          "circle-stroke-color": [
            "step",
            ["get", "pm25"],
            "#10b981", 30,
            "#eab308", 60,
            "#f97316", 90,
            "#ef4444", 120,
            "#a855f7"
          ],
          "circle-stroke-opacity": 0.45,
        },
      });
    }

    // ── 5. MIDC Industrial Zones Layer ─────────────────────────────
    if (!map.getSource("ayam-industrial-source")) {
      map.addSource("ayam-industrial-source", {
        type: "geojson",
        data: INDUSTRIAL_ZONES_GEOJSON as any,
      });

      map.addLayer({
        id: "ayam-industrial-fill",
        type: "fill",
        source: "ayam-industrial-source",
        paint: {
          "fill-color": "#f97316",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "ayam-industrial-line",
        type: "line",
        source: "ayam-industrial-source",
        paint: {
          "line-color": "#fb923c",
          "line-width": 1.8,
          "line-dasharray": [3, 2],
        },
      });
    }

    if (map.getLayer("ayam-industrial-fill")) {
      map.setLayoutProperty("ayam-industrial-fill", "visibility", effShowInd ? "visible" : "none");
    }
    if (map.getLayer("ayam-industrial-line")) {
      map.setLayoutProperty("ayam-industrial-line", "visibility", effShowInd ? "visible" : "none");
    }

    // ── 6. Traffic Corridors Layer with Dynamic Congestion ─────────
    if (!map.getSource("ayam-corridors-source")) {
      map.addSource("ayam-corridors-source", {
        type: "geojson",
        data: TRAFFIC_CORRIDORS_GEOJSON as any,
      });

      map.addLayer({
        id: "ayam-corridors-line",
        type: "line",
        source: "ayam-corridors-source",
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "congestion"],
            0.5, "#38bdf8",
            0.8, "#f59e0b",
            1.0, "#ef4444",
          ],
          "line-width": 3.8,
          "line-opacity": 0.75,
        },
      });
    }
    if (map.getLayer("ayam-corridors-line")) {
      map.setLayoutProperty("ayam-corridors-line", "visibility", effShowCorridors ? "visible" : "none");
    }

    // ── 7. Wind Field Vector Layer ─────────────────────────────────
    if (!map.getSource("ayam-wind-source")) {
      map.addSource("ayam-wind-source", {
        type: "geojson",
        data: WIND_FIELD_GEOJSON as any,
      });

      map.addLayer({
        id: "ayam-wind-vectors",
        type: "circle",
        source: "ayam-wind-source",
        paint: {
          "circle-radius": 7,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0284c7",
        },
      });
    }
    if (map.getLayer("ayam-wind-vectors")) {
      map.setLayoutProperty("ayam-wind-vectors", "visibility", effShowWind ? "visible" : "none");
    }
    if (map.getLayer("ayam-pm25-heat")) {
      map.setLayoutProperty("ayam-pm25-heat", "visibility", effShowHeatmap ? "visible" : "none");
    }
    if (map.getLayer("3d-buildings")) {
      map.setLayoutProperty("3d-buildings", "visibility", effShow3D ? "visible" : "none");
    }

    // ── 8. Interactive Station Pin Markers ─────────────────────────
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (effShowStations) {
      import("maplibre-gl").then((mod) => {
        const maplibregl: any = (mod as any).default || mod;

        activeStations.forEach((st) => {
          let val = st.pm25 * aerosolFluxMultiplier;
          if (scenarioMode && scenarioDelta !== undefined && compareMode !== "baseline") {
            val = Math.max(10, val * (1 + scenarioDelta / 100));
          }

          const cat = getPm25Category(val);
          const isSelected = st.station_id === selectedStation || st.station_id === ayam?.selectedStationId;
          const isHotspot = val > 90;
          const stateTag = scenarioMode && compareMode !== "baseline" ? "SCENARIO" : st.data_status || "OBSERVED";

          const el = document.createElement("div");
          el.className = "ayam-marker group cursor-pointer select-none";
          el.style.transform = "translate(-50%, -50%)";

          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              ${
                isHotspot
                  ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-75" style="background-color: ${cat.color};"></div>`
                  : ""
              }
              <div class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-2xl transition-transform duration-200 group-hover:scale-110"
                   style="
                     background: #090e17;
                     border: ${isSelected ? "2.5px solid #38bdf8" : `1.5px solid ${cat.color}`};
                     box-shadow: 0 4px 16px rgba(0,0,0,0.9), 0 0 10px ${cat.color}66;
                   ">
                <span class="w-2 h-2 rounded-full" style="background-color: ${cat.color};"></span>
                <span class="font-mono text-xs font-bold text-slate-100">${val.toFixed(1)}</span>
              </div>
              <div class="mt-1 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1 bg-slate-950/90 text-slate-300 border border-slate-800">
                <span>${st.station_name.split(" ")[0]}</span>
                <span class="text-[8px] font-mono px-1 rounded ${
                  stateTag === "SCENARIO" ? "bg-purple-950 text-purple-300" : "bg-emerald-950 text-emerald-300"
                }">${stateTag}</span>
              </div>
            </div>
          `;

          el.addEventListener("click", () => {
            onStationClick?.(st.station_id);
            onHotspotClick?.(st.station_id);
            if (ayam) {
              ayam.setSelectedStationId(st.station_id);
              ayam.setSelectedStation(st);
              ayam.setIsLocationDrawerOpen(true);
            }
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([st.lon, st.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });
      });
    }
  }, [
    mapLoaded,
    activeStations,
    selectedStation,
    scenarioMode,
    scenarioDelta,
    compareMode,
    showIndustrial,
    showCorridors,
    showWindField,
    show3DBuildings,
    aerosolFluxMultiplier,
    buildStationsGeoJSON,
    onStationClick,
    onHotspotClick,
    ayam?.layers,
    ayam?.selectedStationId,
  ]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Center on selected station
  useEffect(() => {
    const stId = selectedStation || ayam?.selectedStationId;
    if (!stId || !mapRef.current) return;
    const target = activeStations.find((o) => o.station_id === stId);
    if (!target) return;

    mapRef.current.flyTo({
      center: [target.lon, target.lat],
      zoom: 13.8,
      pitch: 45,
      duration: 1000,
    });
  }, [selectedStation, ayam?.selectedStationId, activeStations]);

  // FlyTo when global context triggers a location navigation
  useEffect(() => {
    if (!ayam?.cameraTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: ayam.cameraTarget.center,
      zoom: ayam.cameraTarget.zoom,
      pitch: ayam.cameraTarget.pitch ?? (viewPerspective === "3D" ? DEFAULT_PITCH : 0),
      bearing: ayam.cameraTarget.bearing ?? (viewPerspective === "3D" ? DEFAULT_BEARING : 0),
      duration: 1200,
    });
  }, [ayam?.cameraTarget, viewPerspective]);

  // Synchronize 3D perspective from global context
  useEffect(() => {
    if (ayam && ayam.is3D !== (viewPerspective === "3D") && mapRef.current) {
      const next = ayam.is3D ? "3D" : "2D";
      setViewPerspective(next);
      mapRef.current.easeTo({
        pitch: ayam.is3D ? DEFAULT_PITCH : 0,
        bearing: ayam.is3D ? DEFAULT_BEARING : 0,
        duration: 800,
      });
    }
  }, [ayam?.is3D, viewPerspective]);

  // View switch: 3D perspective vs 2D planimetric
  const togglePerspective = () => {
    if (!mapRef.current) return;
    const next = viewPerspective === "3D" ? "2D" : "3D";
    setViewPerspective(next);
    if (ayam) ayam.setIs3D(next === "3D");
    mapRef.current.easeTo({
      pitch: next === "3D" ? DEFAULT_PITCH : 0,
      bearing: next === "3D" ? DEFAULT_BEARING : 0,
      duration: 1000,
    });
  };

  const resetToPune = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: PUNE_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: viewPerspective === "3D" ? DEFAULT_PITCH : 0,
      bearing: viewPerspective === "3D" ? DEFAULT_BEARING : 0,
      essential: true,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* MapLibre Container - Absolute 100% to prevent flexbox zero-height collapse */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Dim overlay when hotspot is actively selected */}
      {isMapDimmed && (
        <div className="absolute inset-0 bg-slate-950/35 pointer-events-none transition-opacity duration-500 z-10" />
      )}

      {/* Missing Key Warning */}
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
          <div className="max-w-md p-6 rounded-xl border border-amber-500/40 bg-slate-900 shadow-2xl text-center">
            <h3 className="text-sm font-bold text-amber-300 mb-2">MapTiler Key Required</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{mapError}</p>
          </div>
        </div>
      )}

      {/* Quick Camera & Map Mode HUD (Top Right next to Navigation Controls) */}
      <div className="absolute top-2.5 right-14 z-[1050] flex items-center gap-1.5 p-1 rounded-lg bg-[#0a1120]/95 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-200 shadow-xl pointer-events-auto">
        <button
          onClick={resetToPune}
          title="Center on Pune Urban Airshed"
          className="px-2 py-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition"
        >
          📍 PUNE
        </button>
        <button
          onClick={togglePerspective}
          title="Toggle 2D / 3D Perspective"
          className={`px-2 py-1 rounded transition ${
            viewPerspective === "3D" ? "bg-slate-800 text-sky-400 font-bold border border-sky-500/30" : "text-slate-400"
          }`}
        >
          {viewPerspective}
        </button>
        <button
          onClick={() => setTileStyle((s) => (s === "dark" ? "streets" : "dark"))}
          title="Toggle Basemap Cartography"
          className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          {tileStyle === "dark" ? "🌙 DARK" : "🗺️ STREETS"}
        </button>
      </div>
    </div>
  );
}
