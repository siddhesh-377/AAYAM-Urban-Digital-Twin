import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AyamProvider } from "@/context/AyamContext";
import { AyamHeader } from "@/components/AyamHeader";
import { LocationIntelligenceDrawer } from "@/components/LocationIntelligenceDrawer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "AYAM — Urban Environmental Digital Twin",
    template: "%s | AYAM",
  },
  description:
    "AYAM is a high-precision GIS digital twin for Pune and Pimpri-Chinchwad (PCMC) connecting real-time air quality observations, meteorology, traffic proxies, and industrial activity for forecasting, source attribution, and policy intervention simulation.",
  keywords: [
    "AYAM",
    "Pune",
    "PCMC",
    "Pimpri-Chinchwad",
    "PM2.5",
    "Air Quality",
    "Digital Twin",
    "Urban Environmental Analytics",
    "GIS",
    "Machine Learning",
    "XGBoost",
    "CPCB",
    "MPCB",
  ],
  openGraph: {
    title: "AYAM — Urban Environmental Digital Twin",
    description: "Pune & PCMC Airshed Intelligence Platform. Observe • Analyze • Forecast • Simulate • Intervene.",
    siteName: "AYAM",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#070c14] text-slate-100 antialiased h-screen flex flex-col font-sans overflow-hidden">
        <AyamProvider>
          <AyamHeader />
          <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
            {children}
          </main>
          <LocationIntelligenceDrawer />
        </AyamProvider>
      </body>
    </html>
  );
}
