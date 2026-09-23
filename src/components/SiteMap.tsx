"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { DEFAULT_PIN_COLOR } from "@/lib/siteMapColor";

/**
 * leaflet.markercluster is a legacy Leaflet plugin: it expects a mutable global `L` it can patch
 * (`L.MarkerClusterGroup = ...`) rather than importing leaflet itself. The ES module namespace object from
 * `import("leaflet")` is frozen, so that patch would throw -- this loads leaflet once, copies it into a plain
 * mutable object, publishes that as `window.L` so the plugin's top-level code can extend it, then loads the
 * plugin. Cached at module scope so every <SiteMap> (and every re-render) reuses the same already-patched `L`
 * instead of re-running the plugin's patch against a fresh, unpatched copy.
 */
let leafletWithClusteringPromise: Promise<typeof import("leaflet")> | null = null;

function loadLeafletWithClustering(): Promise<typeof import("leaflet")> {
  if (!leafletWithClusteringPromise) {
    leafletWithClusteringPromise = import("leaflet").then(async (leafletModule) => {
      const L = { ...leafletModule } as typeof leafletModule;
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.markercluster");
      return L;
    });
  }
  return leafletWithClusteringPromise;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  fields: { key: string; value: string }[];
  color?: string;
  /** One or more colors to render as pie/stripe wedges on the pin (e.g. one wedge per Trade) -- takes precedence over `color` when present. */
  colors?: string[];
  /** "circle" (default) or "triangle" -- lets two related pin sets on the same map (e.g. vendors vs. the sites
   * tied to them) stay colored the same way while still being tellable apart by outline alone. "triangle" is
   * meant for a vendor's own pin -- it always shows a single color (the first of `colors`), since an icon
   * can't be split into wedges the way a circle can. */
  shape?: "circle" | "triangle";
}

const PIN_RADIUS = 8;
const PIN_STROKE = "#1c1430";

/** A simple upward-pointing triangle, inscribed in the same radius as the circle marker, used for a vendor's
 * own pin so it's tellable apart from the (circular) sites tied to it at a glance. */
function buildTriangleSvg(fill: string, size: number): string {
  const c = size / 2;
  const r = PIN_RADIUS * 1.05;
  const top = `${c},${(c - r).toFixed(2)}`;
  const bottomRight = `${(c + r * 0.87).toFixed(2)},${(c + r * 0.5).toFixed(2)}`;
  const bottomLeft = `${(c - r * 0.87).toFixed(2)},${(c + r * 0.5).toFixed(2)}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><polygon points="${top} ${bottomRight} ${bottomLeft}" fill="${fill}" fill-opacity="0.95" stroke="${PIN_STROKE}" stroke-width="2" stroke-linejoin="round" /></svg>`;
}

/** Builds a small SVG marker -- a triangle, or a circle (single-filled or split into one wedge per color) --
 * for use as a Leaflet divIcon. */
function buildPinSvg(colors: string[], shape: "circle" | "triangle" = "circle"): string {
  const size = PIN_RADIUS * 2 + 4;
  const c = size / 2;
  const r = PIN_RADIUS;

  if (shape === "triangle") {
    return buildTriangleSvg(colors[0] ?? DEFAULT_PIN_COLOR, size);
  }

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
  const markersLayerRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const onPinClickRef = useRef(onPinClick);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    let cancelled = false;

    loadLeafletWithClustering().then((L) => {
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
      // Clusters nearby pins into a numbered bubble that splits apart on zoom -- without this, a few hundred
      // sites in the same metro area render as an unreadable pile of overlapping, indistinguishable dots.
      const markersLayer = L.markerClusterGroup({ maxClusterRadius: 60 });
      markersLayerRef.current = markersLayer;
      markersLayer.addTo(map);
      const bounds: [number, number][] = [];

      for (const pin of pins) {
        const size = PIN_RADIUS * 2 + 4;
        const icon = L.divIcon({
          html: buildPinSvg(pin.colors ?? [pin.color ?? DEFAULT_PIN_COLOR], pin.shape ?? "circle"),
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon });
        marker.bindTooltip(buildTooltipContent(pin), { direction: "top", offset: [0, -8] });
        marker.on("click", () => onPinClickRef.current(pin.id));
        markersLayer.addLayer(marker);
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
