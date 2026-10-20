"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MapPin {
  key: string;
  lat: number;
  lng: number;
  count: number;
  thumb?: string;
}

/** OpenStreetMap through Leaflet. Pins can show a photo; the map can also let you tap to choose a point. */
export function LeafletMap({
  pins = [],
  picked,
  onPick,
  onPinClick,
  label,
  className,
  center,
  zoom,
}: {
  pins?: MapPin[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (point: { lat: number; lng: number }) => void;
  onPinClick?: (key: string) => void;
  label: string;
  className?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<ReturnType<typeof import("leaflet").layerGroup> | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const callbacks = useRef({ onPick, onPinClick });
  callbacks.current = { onPick, onPinClick };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !host.current || map.current) return;
      leaflet.current = L;
      const m = L.map(host.current, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView(center ? [center.lat, center.lng] : [30, 0], zoom ?? (center ? 12 : 2));
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      m.on("click", (e) => callbacks.current.onPick?.({ lat: Math.round(e.latlng.lat * 1e5) / 1e5, lng: Math.round(e.latlng.lng * 1e5) / 1e5 }));
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      draw();
      drawPicked();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      pickMarker.current = null;
    };
    // The map itself is created once; pins and the picked point are redrawn by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m || !layer.current) return;
    layer.current.clearLayers();
    const bounds: Array<[number, number]> = [];
    for (const pin of pins) {
      const el = document.createElement("div");
      el.className = "relative";
      const face = document.createElement("div");
      face.className = "h-12 w-12 overflow-hidden rounded-full border-[3px] border-white bg-rose-soft shadow-lg";
      if (pin.thumb) {
        const img = document.createElement("img");
        img.src = pin.thumb;
        img.alt = "";
        img.className = "h-full w-full object-cover";
        face.appendChild(img);
      }
      el.appendChild(face);
      if (pin.count > 1) {
        const badge = document.createElement("span");
        badge.textContent = String(pin.count);
        badge.className = "absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cherry px-1 text-[11px] font-semibold text-white";
        el.appendChild(badge);
      }
      const marker = L.marker([pin.lat, pin.lng], { icon: L.divIcon({ html: el, className: "", iconSize: [48, 48], iconAnchor: [24, 24] }), keyboard: true, title: String(pin.count) });
      marker.on("click", () => callbacks.current.onPinClick?.(pin.key));
      marker.addTo(layer.current);
      bounds.push([pin.lat, pin.lng]);
    }
    if (bounds.length > 0 && !center) m.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }

  useEffect(draw, [pins]); // eslint-disable-line react-hooks/exhaustive-deps

  function drawPicked() {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m) return;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (picked) {
      pickMarker.current = L.marker([picked.lat, picked.lng], {
        icon: L.divIcon({ html: '<div class="h-6 w-6 -translate-x-1/2 -translate-y-full rotate-45 rounded-full rounded-br-none border-2 border-white bg-[#9d394d] shadow-lg"></div>', className: "", iconSize: [0, 0] }),
      }).addTo(m);
      m.setView([picked.lat, picked.lng], Math.max(m.getZoom(), 12));
    }
  }

  useEffect(drawPicked, [picked]);

  return <div ref={host} role="application" aria-label={label} className={cn("z-0 overflow-hidden rounded-3xl bg-rose-soft", className)} />;
}
