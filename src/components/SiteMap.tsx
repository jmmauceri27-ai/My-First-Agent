"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { DEFAULT_PIN_COLOR } from "@/lib/siteMapColor";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  fields: { key: string; value: string }[];
  color?: string;
  /** One or more colors to render as pie wedges on the pin (e.g. one wedge per Trade) -- takes precedence over `color` when present. */
  colors?: string[];
}

const PIN_RADIUS = 8;
const PIN_STROKE = "#1c1430";

/** Builds a small SVG circle (single color) or pie chart (one wedge per color) for use as a Leaflet divIcon. */
function buildPinSvg(colors: string[]): string {
  const size = PIN_RADIUS * 2 + 4;
  const c = size / 2;
  const r = PIN_RADIUS;

  if (colors.length <= 1) {
    const fill = colors[0] ?? DEFAULT_PIN_COLOR;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" fill-opacity="0.9" stroke="${PIN_STROKE}" stroke-width="2" /></svg>`;
  }

  const step = (2 * Math.PI) / colors.length;
  let wedges = "";
  for (let i = 0; i < colors.length; i++) {
    const start = i * step - Math.PI / 2;
    const end = start + step;
    const x1 = c + r * Math.cos(start);
    const y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(end);
    const y2 = c + r * Math.sin(end);
    const largeArc = step > Math.PI ? 1 : 0;
    wedges += `<path d="M ${c} ${c} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${colors[i]}" />`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><g fill-opacity="0.9">${wedges}</g><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${PIN_STROKE}" stroke-width="2" /></svg>`;
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

export default function SiteMap({ pins, onPinClick }: { pins: MapPin[]; onPinClick: (id: string) => void }) {
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
        const size = PIN_RADIUS * 2 + 4;
        const icon = L.divIcon({
          html: buildPinSvg(pin.colors ?? [pin.color ?? DEFAULT_PIN_COLOR]),
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon });
        marker.bindTooltip(buildTooltipContent(pin), { direction: "top", offset: [0, -8] });
        marker.on("click", () => onPinClickRef.current(pin.id));
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
