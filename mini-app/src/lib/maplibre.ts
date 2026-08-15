import { setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

/*
  MapLibre resolves its worker script relative to its own module URL at
  runtime (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`), which only
  works when its dist files are served as-is. Once Vite bundles maplibre-gl
  into a hashed chunk, that relative path 404s (masked as a 200 text/html by
  the SPA fallback) and the map silently never gets tiles. `?worker&url` makes
  Vite bundle the worker's own internal imports into one self-contained file
  and hand back its real built URL, which we give MapLibre directly.

  This lives in one module so every map component picks it up by importing
  from here — duplicating the call in a second component is how the bug
  regresses.
*/
setWorkerUrl(maplibreWorkerUrl);

// OpenFreeMap — genuinely free (no API key, no signup, no usage cap, funded by
// donations rather than a freemium tier that can start charging later).
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Namangan city centre, for when there's nothing better to centre on.
export const FALLBACK_CENTER = { latitude: 41.0012, longitude: 71.6734 };
