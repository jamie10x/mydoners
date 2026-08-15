import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, AttributionControl } from "maplibre-gl";
import { t } from "../i18n/strings";
// Importing this module also performs MapLibre's worker-URL setup — see the
// comment there; without it the map silently never loads tiles in a build.
import { MAP_STYLE } from "../lib/maplibre";

export interface Coords {
  latitude: number;
  longitude: number;
}

export type GeoStatus = "idle" | "locating" | "granted" | "denied";

interface MapPickerProps {
  coords: Coords | null;
  onChange: (coords: Coords) => void;
  onStatusChange?: (status: GeoStatus) => void;
}

// Namangan city center — only used as a starting point when GPS is denied
// and nothing else has set a location yet, so the map has somewhere to
// center rather than the middle of the ocean (0,0).
const FALLBACK_CENTER: Coords = { latitude: 41.0012, longitude: 71.6734 };

/**
 * Draggable delivery-location picker, backed by real map tiles. Drag the pin
 * or click anywhere on the map to move it; the ⌖ button re-centers on GPS.
 */
export function MapPicker({ coords, onChange, onStatusChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [status, setStatus] = useState<GeoStatus>("idle");

  function setStatusBoth(next: GeoStatus) {
    setStatus(next);
    onStatusChange?.(next);
  }

  function moveMarker(next: Coords, recenter: boolean) {
    markerRef.current?.setLngLat([next.longitude, next.latitude]);
    if (recenter) mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 16 });
  }

  function locate(recenter: boolean) {
    setStatusBoth("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        moveMarker(next, recenter);
        onChangeRef.current(next);
        setStatusBoth("granted");
      },
      () => setStatusBoth("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // Mount the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = coords ?? FALLBACK_CENTER;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [start.longitude, start.latitude],
      zoom: coords ? 16 : 13,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }));
    mapRef.current = map;

    const marker = new Marker({ color: "#e2231a", draggable: true })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onChangeRef.current({ latitude: lat, longitude: lng });
    });

    // Tap anywhere on the map to move the pin there too, not just dragging it.
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    });

    // No saved/shared location yet — center on GPS as soon as the map is ready.
    if (!coords) map.once("load", () => locate(true));

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative h-48 overflow-hidden rounded-2xl border border-stone-200">
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
          {t("dragPinHint")}
        </div>
        <button
          type="button"
          onClick={() => locate(true)}
          className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-brand shadow-sm"
          aria-label={t("useCurrentLocationAria")}
        >
          ⌖
        </button>
      </div>
      {status === "locating" && <p className="mt-1.5 text-xs font-medium text-stone-400">{t("locating")}</p>}
      {coords && (
        <p className="mt-1.5 font-mono text-xs text-stone-400">
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
