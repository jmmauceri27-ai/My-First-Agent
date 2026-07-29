"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  fields: { key: string; value: string }[];
}

function buildPopupContent(pin: MapPin): HTMLElement {
  const el = document.createElement("div");
  el.className = "text-sm";

  const title = document.createElement("div");
  title.className = "font-semibold text-slate-900";
  title.textContent = pin.label;
  el.appendChild(title);

  for (const field of pin.fields) {
    const row = document.createElement("div");
    row.className = "text-slate-700";
    row.textContent = `${field.key}: ${field.value}`;
    el.appendChild(row);
  }

  return el;
}

export default function SiteMap({ pins }: { pins: MapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([39.8283, -98.5795], 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      markersLayerRef.current?.remove();
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      const bounds: [number, number][] = [];

      for (const pin of pins) {
        L.circleMarker([pin.lat, pin.lng], {
          radius: 8,
          weight: 2,
          color: "#7c3aed",
          fillColor: "#a78bfa",
          fillOpacity: 0.85,
        })
          .bindPopup(buildPopupContent(pin))
          .addTo(markersLayer);
        bounds.push([pin.lat, pin.lng]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pins]);

  useEffect(() => {
    return () => {
      markersLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-[520px] w-full rounded-lg" />;
}
