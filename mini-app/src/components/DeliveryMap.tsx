import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, AttributionControl, LngLatBounds } from "maplibre-gl";
// Also performs MapLibre's worker-URL setup — see lib/maplibre.ts.
import { MAP_STYLE } from "../lib/maplibre";

interface Coords {
  latitude: number;
  longitude: number;
}

interface DeliveryMapProps {
  courier: Coords | null;
  destination: Coords;
  stale: boolean;
}

function destinationElement(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:18px;height:18px;border-radius:50%;background:#1c1917;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)";
  return el;
}

function courierElement(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:22px;height:22px;border-radius:50%;background:#e2231a;border:3px solid #fff;" +
    "box-shadow:0 1px 6px rgba(0,0,0,.45);transition:opacity .3s";
  return el;
}

/**
 * Read-only delivery map: where the food is going, and where the courier is
 * right now. Renders the destination alone when no courier position exists —
 * that still answers a useful question, and looks like a feature rather than
 * a broken map (see the graceful-degradation note in the tracking page).
 */
export function DeliveryMap({ courier, destination, stale }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const courierMarkerRef = useRef<Marker | null>(null);

  // Mount once. Marker positions are updated in the effect below rather than
  // by re-creating the map.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [destination.longitude, destination.latitude],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }));
    new Marker({ element: destinationElement() })
      .setLngLat([destination.longitude, destination.latitude])
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      courierMarkerRef.current = null;
    };
    // Destination is fixed for the lifetime of an order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !courier) return;

    if (!courierMarkerRef.current) {
      courierMarkerRef.current = new Marker({ element: courierElement() })
        .setLngLat([courier.longitude, courier.latitude])
        .addTo(map);
    } else {
      courierMarkerRef.current.setLngLat([courier.longitude, courier.latitude]);
    }

    courierMarkerRef.current.getElement().style.opacity = stale ? "0.5" : "1";

    // Keep both points in view as the courier closes in.
    const bounds = new LngLatBounds(
      [courier.longitude, courier.latitude],
      [courier.longitude, courier.latitude],
    ).extend([destination.longitude, destination.latitude]);
    map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 600 });
  }, [courier, destination, stale]);

  return <div ref={containerRef} className="h-48 w-full overflow-hidden rounded-2xl border border-stone-200" />;
}
