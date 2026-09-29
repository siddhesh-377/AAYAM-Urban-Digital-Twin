"use client";
// components/AyamHeader.tsx — Persistent GIS-first Header for AYAM Platform
// Displays branding, airshed region switcher, 8 primary intelligence modules,
// global location search, and data pipeline status.

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAyam, KNOWN_PUNE_LOCATIONS, AirshedRegion, GeoLocationItem } from "@/context/AyamContext";

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  badge?: string;
  title: string;
}

const NAV_MODULES: NavItem[] = [
  { href: "/overview", label: "Overview", title: "Airshed State & Real-Time Monitoring" },
  { href: "/city-twin", label: "City Twin", title: "Pune + PCMC 2D/3D Geospatial Twin & Layers" },
  { href: "/pollution", label: "Pollution", title: "Spatial Pollutant Mapping & Observations" },
  { href: "/time-machine", label: "Time Machine", title: "Historical Timeline & Period Comparison" },
  { href: "/source-detective", label: "Source Detective", title: "Driver Attribution & SHAP Breakdown" },
  { href: "/what-if", label: "What-If Simulator", title: "Targeted Intervention Simulation Lab" },
  { href: "/strategy", label: "Strategy Control Room", title: "Municipal Policy Comparison & Decisions" },
  { href: "/data", label: "Data & Methodology", title: "Connected Dataset Provenance & ML Docs" },
];

export function AyamHeader() {
  const pathname = usePathname();
  const {
    selectedRegion,
    setSelectedRegion,
    flyToLocation,
  } = useAyam();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter locations for search
  const filteredLocations = searchQuery.trim()
    ? KNOWN_PUNE_LOCATIONS.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: GeoLocationItem) => {
    flyToLocation(loc);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-[1200] w-full border-b border-slate-800/80 bg-[#080e18]/95 backdrop-blur-md text-slate-100 select-none">
      {/* Top Bar: Identity, Region, Search & Status */}
      <div className="flex h-12 items-center justify-between px-3 md:px-5 border-b border-slate-800/50">
        {/* Left: Branding & Subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/overview" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono font-black text-sm tracking-wider shadow-inner group-hover:border-emerald-400 transition-colors">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-mono text-sm font-black tracking-widest text-white">
                  AYAM
                </span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold tracking-wider">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Urban Environmental Digital Twin
              </p>
            </div>
          </Link>

          <span className="text-slate-700 mx-1 hidden sm:inline">|</span>

          {/* Region Selector */}
          <div className="flex items-center rounded-md bg-slate-900/90 p-0.5 border border-slate-800 text-[11px] font-medium font-mono">
            <button
              onClick={() => setSelectedRegion("ALL")}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedRegion === "ALL"
                  ? "bg-slate-700/80 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Pune Metropolitan Airshed (PMC + PCMC)"
            >
              Pune + PCMC
            </button>
            <button
              onClick={() => setSelectedRegion("PUNE")}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedRegion === "PUNE"
                  ? "bg-slate-700/80 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Pune Municipal Corporation (PMC)"
            >
              Pune
            </button>
            <button
              onClick={() => setSelectedRegion("PCMC")}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedRegion === "PCMC"
                  ? "bg-slate-700/80 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Pimpri-Chinchwad Municipal Corporation (PCMC)"
            >
              PCMC
            </button>
          </div>
        </div>

        {/* Center: Global Location Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-md mx-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500 text-xs pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search station, ward, industrial area, corridor..."
              className="w-full h-7 pl-8 pr-3 text-xs bg-slate-900/80 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 font-sans"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && filteredLocations.length > 0 && (
            <div className="absolute top-8 inset-x-0 bg-slate-900/98 border border-slate-700 rounded-md shadow-2xl overflow-hidden z-[1300] max-h-64 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider">
                Geographic Entities ({filteredLocations.length})
              </div>
              {filteredLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 transition-colors flex items-center justify-between border-b border-slate-800/40 last:border-b-0"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {loc.name}
                    </div>
                    {loc.description && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {loc.description}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                      {loc.region}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-sky-400 font-mono uppercase">
                      {loc.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sensing Stream & Airshed Status */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">CPCB/OpenAQ:</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>

          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span>Airshed:</span>
            <span className="text-slate-200">18.52°N, 73.86°E</span>
          </div>
        </div>
      </div>

      {/* Navigation Modules Bar */}
      <nav className="flex items-center gap-1 px-3 md:px-5 h-9 overflow-x-auto no-scrollbar bg-[#060a12]/90">
        {NAV_MODULES.map((mod) => {
          const isActive =
            mod.href === "/overview"
              ? pathname === "/" || pathname === "/overview"
              : pathname.startsWith(mod.href);

          return (
            <Link
              key={mod.href}
              href={mod.href}
              title={mod.title}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-slate-800/90 text-sky-400 font-semibold border-b-2 border-sky-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <span>{mod.label}</span>
              {mod.badge && (
                <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-300 font-mono">
                  {mod.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
