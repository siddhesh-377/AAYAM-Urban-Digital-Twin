"use client";
// app/city-twin/page.tsx — Pune + PCMC 3D Urban Environmental Digital Twin
// Core GIS spatial exploration module with level-of-detail 3D building extrusions,
// administrative boundaries, road network, rivers, and industrial zones.

import React, { useEffect, useState } from "react";
import { PuneMap } from "@/components/PuneMap";
import { LayerManager } from "@/components/LayerManager";
import { StatusBadge } from "@/components/StatusBadge";
import { api, Observation } from "@/lib/api";
import { useAyam } from "@/context/AyamContext";

export default function CityTwinPage() {
  const {
    selectedRegion,
    setSelectedStationId,
    setSelectedStation,
    setIsLocationDrawerOpen,
    flyToLocation,
    layers,
  } = useAyam();

  const [observations, setObservations] = useState<Observation[]>([]);
  const [activePreset, setActivePreset] = useState<string>("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.overview();
        setObservations(res.stations || []);
      } catch (err) {
        console.warn("[AYAM City Twin] Using cached station network:", err);
      }
    }
    loadData();
  }, []);

  const handleStationClick = (stationId: string) => {
    setSelectedStationId(stationId);
    const st = observations.find((o) => o.station_id === stationId) || null;
    setSelectedStation(st);
    setIsLocationDrawerOpen(true);
  };

  const handleFlyToPreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === "PMC") {
      flyToLocation({ center: [73.8567, 18.5204], zoom: 13.5, pitch: 48, bearing: -15 });
    } else if (preset === "PCMC") {
      flyToLocation({ center: [73.8437, 18.6279], zoom: 13.8, pitch: 50, bearing: -10 });
    } else if (preset === "HADAPSAR") {
      flyToLocation({ center: [73.9260, 18.5089], zoom: 14.0, pitch: 45, bearing: -20 });
    } else if (preset === "HINJAWADI") {
      flyToLocation({ center: [73.7688, 18.5987], zoom: 13.8, pitch: 45, bearing: -10 });
    } else {
      flyToLocation({ center: [73.8400, 18.5600], zoom: 11.5, pitch: 35, bearing: 0 });
    }
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden bg-[#070c14]">
      {/* City Twin Top Controls HUD */}
      <div className="z-[1100] px-4 py-2 border-b border-slate-800/80 bg-[#080e18]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Pune & PCMC Digital Twin
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              3D GIS Engine
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Quick Camera Bookmarks */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono">
            <span className="text-slate-400 text-[10px]">SECTOR:</span>
            <button
              onClick={() => handleFlyToPreset("ALL")}
              className={`px-2 py-0.5 rounded transition-all ${
                activePreset === "ALL"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              All Airshed
            </button>
            <button
              onClick={() => handleFlyToPreset("PMC")}
              className={`px-2 py-0.5 rounded transition-all ${
                activePreset === "PMC"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              Pune Core (PMC)
            </button>
            <button
              onClick={() => handleFlyToPreset("PCMC")}
              className={`px-2 py-0.5 rounded transition-all ${
                activePreset === "PCMC"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              PCMC Industrial
            </button>
            <button
              onClick={() => handleFlyToPreset("HADAPSAR")}
              className={`px-2 py-0.5 rounded transition-all ${
                activePreset === "HADAPSAR"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              Hadapsar East
            </button>
            <button
              onClick={() => handleFlyToPreset("HINJAWADI")}
              className={`px-2 py-0.5 rounded transition-all ${
                activePreset === "HINJAWADI"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              Hinjawadi West
            </button>
          </div>
        </div>

        {/* Right Info: Cartographic Sources */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden lg:flex items-center gap-1.5 text-slate-400">
            <span>Projection:</span>
            <span className="text-slate-200">EPSG:3857 (Web Mercator)</span>
          </div>
          <StatusBadge status="REFERENCE" size="sm" />
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative flex-1 w-full h-full min-h-0">
        <PuneMap
          observations={observations}
          onStationClick={handleStationClick}
          onHotspotClick={handleStationClick}
          showIndustrial={layers.showIndustrialZones}
          showCorridors={layers.showTrafficCorridors}
          showWindField={layers.showWindField}
          show3DBuildings={layers.show3DBuildings}
        />

        {/* Layer Manager & Map Legend */}
        <LayerManager />

        {/* Bottom Cartography Metadata Pill */}
        <div className="absolute bottom-3 right-3 z-[1100] px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0a1120]/90 text-[10px] font-mono text-slate-400 backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-3">
          <span>Base: MapTiler Streets-v4 / OpenMapTiles</span>
          <span>•</span>
          <span>Heights: OpenStreetMap 3D Extrusions (LOD-2)</span>
          <span>•</span>
          <span>Terrain: SRTM Elevation Mesh</span>
        </div>
      </div>
    </div>
  );
}
