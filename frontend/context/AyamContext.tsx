"use client";
// context/AyamContext.tsx — Global Context for AYAM Digital Twin
// Provides persistent region selection (Pune / PCMC / All), global location search,
// camera fly-to triggers, and active geographic/environmental layer states.

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Observation } from "@/lib/api";

export type AirshedRegion = "ALL" | "PUNE" | "PCMC";

export interface GeoLocationItem {
  id: string;
  name: string;
  type: "station" | "ward" | "industrial" | "corridor" | "landmark";
  region: "PMC" | "PCMC" | "METRO";
  coordinates: [number, number]; // [lon, lat]
  description?: string;
}

export const KNOWN_PUNE_LOCATIONS: GeoLocationItem[] = [
  { id: "DEMO-SHIVAJINAGAR", name: "Shivajinagar Transit Core", type: "station", region: "PMC", coordinates: [73.8446, 18.5314], description: "Major multimodal transit hub & commercial core" },
  { id: "DEMO-HADAPSAR", name: "Hadapsar Industrial Belt", type: "station", region: "PMC", coordinates: [73.9260, 18.5089], description: "Eastern manufacturing & logistics corridor" },
  { id: "DEMO-BHOSARI", name: "Bhosari MIDC Cluster", type: "station", region: "PCMC", coordinates: [73.8437, 18.6279], description: "Heavy fabrication & auto stamping cluster" },
  { id: "DEMO-KATRAJ", name: "Katraj Southern Pass", type: "station", region: "PMC", coordinates: [73.8677, 18.4575], description: "Southern valley entry & highway freight choke" },
  { id: "DEMO-LOHEGAON", name: "Lohegaon Airport Airshed", type: "station", region: "PMC", coordinates: [73.9197, 18.5822], description: "Aviation & north-eastern residential basin" },
  { id: "DEMO-PASHAN", name: "Pashan Science Core (IISER)", type: "station", region: "PMC", coordinates: [73.7928, 18.5414], description: "Vegetated research campus & western background baseline" },
  { id: "DEMO-KOTHRUD", name: "Kothrud Residential Zone", type: "station", region: "PMC", coordinates: [73.8077, 18.5074], description: "High-density western residential valley" },
  { id: "DEMO-WAKAD", name: "Wakad / Hinjawadi IT Corridor", type: "station", region: "PCMC", coordinates: [73.7688, 18.5987], description: "Tech corridor & heavy commuter arterial" },
  { id: "LOC-PIMPRI", name: "Pimpri Municipal Core", type: "landmark", region: "PCMC", coordinates: [73.8010, 18.6270], description: "Administrative center of Pimpri-Chinchwad" },
  { id: "LOC-CHINCHWAD", name: "Chinchwad Industrial Estate", type: "industrial", region: "PCMC", coordinates: [73.7910, 18.6430], description: "Engineering, metal works & logistics" },
  { id: "LOC-CHAKAN", name: "Chakan Auto Hub", type: "industrial", region: "PCMC", coordinates: [73.8550, 18.7520], description: "Northern automotive manufacturing corridor" },
  { id: "LOC-FC-ROAD", name: "FC Road & JM Road Commercial Axis", type: "corridor", region: "PMC", coordinates: [73.8430, 18.5190], description: "Central arterial with dense stop-and-go vehicular flow" },
  { id: "LOC-KARVE-ROAD", name: "Karve Road Transit Arterial", type: "corridor", region: "PMC", coordinates: [73.8360, 18.5100], description: "South-western arterial connecting Kothrud and Deccan" },
  { id: "LOC-VIMAN-NAGAR", name: "Nagar Road / Viman Nagar", type: "corridor", region: "PMC", coordinates: [73.9100, 18.5600], description: "Primary eastern gateway & IT precinct" },
];

export interface LayerSettings {
  show3DBuildings: boolean;
  showHeatmap: boolean;
  showStations: boolean;
  showTrafficCorridors: boolean;
  showIndustrialZones: boolean;
  showWindField: boolean;
  showBoundaries: boolean;
}

export interface MapCameraTarget {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

interface AyamContextType {
  selectedRegion: AirshedRegion;
  setSelectedRegion: (region: AirshedRegion) => void;
  selectedStationId: string | null;
  setSelectedStationId: (id: string | null) => void;
  selectedStation: Observation | null;
  setSelectedStation: (st: Observation | null) => void;
  cameraTarget: MapCameraTarget | null;
  flyToLocation: (loc: GeoLocationItem | MapCameraTarget) => void;
  layers: LayerSettings;
  toggleLayer: (key: keyof LayerSettings) => void;
  setLayer: (key: keyof LayerSettings, val: boolean) => void;
  isLocationDrawerOpen: boolean;
  setIsLocationDrawerOpen: (open: boolean) => void;
  is3D: boolean;
  setIs3D: (is3d: boolean) => void;
}

const defaultLayers: LayerSettings = {
  show3DBuildings: true,
  showHeatmap: true,
  showStations: true,
  showTrafficCorridors: true,
  showIndustrialZones: true,
  showWindField: true,
  showBoundaries: true,
};

const AyamContext = createContext<AyamContextType | null>(null);

export function AyamProvider({ children }: { children: React.ReactNode }) {
  const [selectedRegion, setSelectedRegionState] = useState<AirshedRegion>("ALL");
  const [selectedStationId, setSelectedStationId] = useState<string | null>("DEMO-SHIVAJINAGAR");
  const [selectedStation, setSelectedStation] = useState<Observation | null>(null);
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const [layers, setLayers] = useState<LayerSettings>(defaultLayers);
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState<boolean>(false);

  const setSelectedRegion = useCallback((region: AirshedRegion) => {
    setSelectedRegionState(region);
    if (region === "PUNE") {
      setCameraTarget({ center: [73.8567, 18.5204], zoom: 12.2, pitch: 35 });
    } else if (region === "PCMC") {
      setCameraTarget({ center: [73.8150, 18.6280], zoom: 12.4, pitch: 35 });
    } else {
      setCameraTarget({ center: [73.8400, 18.5600], zoom: 11.4, pitch: 30 });
    }
  }, []);

  const flyToLocation = useCallback((loc: GeoLocationItem | MapCameraTarget) => {
    if ("coordinates" in loc) {
      setCameraTarget({
        center: loc.coordinates,
        zoom: loc.type === "station" ? 14.5 : 13.5,
        pitch: 45,
      });
      if (loc.type === "station") {
        setSelectedStationId(loc.id);
        setIsLocationDrawerOpen(true);
      }
    } else {
      setCameraTarget(loc);
    }
  }, []);

  const [is3D, setIs3D] = useState<boolean>(true);

  const toggleLayer = useCallback((key: keyof LayerSettings) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setLayer = useCallback((key: keyof LayerSettings, val: boolean) => {
    setLayers((prev) => ({ ...prev, [key]: val }));
  }, []);

  const value = useMemo(
    () => ({
      selectedRegion,
      setSelectedRegion,
      selectedStationId,
      setSelectedStationId,
      selectedStation,
      setSelectedStation,
      cameraTarget,
      flyToLocation,
      layers,
      toggleLayer,
      setLayer,
      isLocationDrawerOpen,
      setIsLocationDrawerOpen,
      is3D,
      setIs3D,
    }),
    [
      selectedRegion,
      setSelectedRegion,
      selectedStationId,
      selectedStation,
      cameraTarget,
      flyToLocation,
      layers,
      toggleLayer,
      setLayer,
      isLocationDrawerOpen,
      is3D,
    ]
  );

  return <AyamContext.Provider value={value}>{children}</AyamContext.Provider>;
}

export function useAyam() {
  const context = useContext(AyamContext);
  if (!context) {
    throw new Error("useAyam must be used within an AyamProvider");
  }
  return context;
}

export function useAyamSafe() {
  return useContext(AyamContext);
}
