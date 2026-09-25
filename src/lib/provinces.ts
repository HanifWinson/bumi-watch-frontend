import type { FeatureCollection } from 'geojson';

// Province outlines, bundled in /public (names normalised to the backend's list).
// Shared by the landing globe and the dashboard map, so the file loads once.
let provincesPromise: Promise<FeatureCollection> | null = null;

export function loadProvinces() {
  provincesPromise ??= fetch('/indonesia-provinces.geojson').then((r) => {
    if (!r.ok) throw new Error('Could not load province shapes');
    return r.json();
  });
  return provincesPromise;
}
