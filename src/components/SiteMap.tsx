"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { DEFAULT_PIN_COLOR } from "@/lib/siteMapColor";

export interface MapPin {
  rowId: number;
  lat: number;
  lng: number;
  label: string;
  fields: { key: string; value: string }[];
  color?: string;
}

function buildTooltipContent(pin: MapPin): HTMLElement {
  const el = document.createElement("div");
  el.className = "text-xs";

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

export default function SiteMap({ pins, onPinClick }: { pins: MapPin[]; onPinClick: (rowId: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onPinClickRef = useRef(onPinClick);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

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
        const fillColor = pin.color ?? DEFAULT_PIN_COLOR;
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: 8,
          weight: 2,
          color: "#1c1430",
          fillColor,
          fillOpacity: 0.9,
        });
        marker.bindTooltip(buildTooltipContent(pin), { direction: "top", offset: [0, -8] });
        marker.on("click", () => onPinClickRef.current(pin.rowId));
        marker.addTo(markersLayer);
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

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
