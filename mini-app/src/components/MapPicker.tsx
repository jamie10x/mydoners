import { useEffect, useRef, useState } from "react";

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
// and nothing else has set a location yet, so the picker has somewhere to
// show a pin rather than a blank box.
const FALLBACK_CENTER: Coords = { latitude: 41.0012, longitude: 71.6734 };

/**
 * Draggable delivery-location picker. Deliberately not wired to a real map
 * tile provider yet (Yandex Static Maps needs an API key we don't have) —
 * the CSS-drawn background is a stand-in. Dragging genuinely produces real
 * lat/lng though, scaled for fine local adjustment (a few hundred meters)
 * rather than global panning; paired with the free-text landmark field for
 * precision. Swapping in real map tiles later only touches the background,
 * not how coordinates are produced.
 */
export function MapPicker({ coords, onChange, onStatusChange }: MapPickerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const baseRef = useRef<Coords>(coords ?? FALLBACK_CENTER);
  const [pinPos, setPinPos] = useState({ x: 50, y: 50 });
  const [status, setStatus] = useState<GeoStatus>("idle");

  function setStatusBoth(next: GeoStatus) {
    setStatus(next);
    onStatusChange?.(next);
  }

  function locate(recenter: boolean) {
    setStatusBoth("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        baseRef.current = next;
        if (recenter) setPinPos({ x: 50, y: 50 });
        onChange(next);
        setStatusBoth("granted");
      },
      () => setStatusBoth("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // Auto-center on GPS once, only if nothing has set a location yet.
  useEffect(() => {
    if (!coords) locate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDrag(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    setPinPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });

    const base = baseRef.current;
    const dLat = ((rect.height / 2 - y) / rect.height) * 0.01;
    const dLng = ((x - rect.width / 2) / rect.width) * 0.01;
    onChange({ latitude: base.latitude + dLat, longitude: base.longitude + dLng });
  }

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          draggingRef.current = true;
          applyDrag(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => draggingRef.current && applyDrag(e.clientX, e.clientY)}
        onPointerUp={() => (draggingRef.current = false)}
        onPointerLeave={() => (draggingRef.current = false)}
        className="relative h-48 touch-none overflow-hidden rounded-2xl border border-stone-200 bg-sky-100"
      >
        <div
          className="absolute -inset-4"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #eae3d6 0 22%, transparent 23%)," +
              "radial-gradient(circle at 75% 60%, #eae3d6 0 28%, transparent 29%)," +
              "radial-gradient(circle at 55% 15%, #eae3d6 0 16%, transparent 17%)",
          }}
        />
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
          ✥ Drag to adjust
        </div>
        <button
          type="button"
          onClick={() => locate(true)}
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-brand shadow-sm"
          aria-label="Use current location"
        >
          ⌖
        </button>
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-3xl"
          style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
        >
          📍
        </div>
      </div>
      {status === "locating" && <p className="mt-1.5 text-xs font-medium text-stone-400">Finding your location…</p>}
      {coords && (
        <p className="mt-1.5 font-mono text-xs text-stone-400">
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
