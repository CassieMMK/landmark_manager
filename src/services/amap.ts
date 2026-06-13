/**
 * AMap (高德地图) Route Planning API Service
 *
 * Handles:
 *  - WGS-84 ↔ GCJ-02 coordinate conversion
 *  - Walking / Driving / Cycling route planning via AMap REST API
 *  - Route response parsing into a unified format
 */

// ────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────

const AMAP_KEY = 'eae4ac1b410f21c489d21a6e112d21f4';

const AMAP_API = {
  walking:  'https://restapi.amap.com/v3/direction/walking',
  driving:  'https://restapi.amap.com/v3/direction/driving',
  bicycling:'https://restapi.amap.com/v4/direction/bicycling',
} as const;

// ────────────────────────────────────────────
//  WGS-84 ↔ GCJ-02 Coordinate Conversion
//  (China uses GCJ-02; GPS / Leaflet use WGS-84)
// ────────────────────────────────────────────

const PI  = Math.PI;
const A   = 6378245.0;          // semi-major axis
const EE  = 0.00669342162296594; // eccentricity squared

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number): number {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat
          + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320.0 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(lng: number, lat: number): number {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng
          + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

/** Convert WGS-84 → GCJ-02 (for sending to AMap API) */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

/** Convert GCJ-02 → WGS-84 (for displaying AMap results on Leaflet) */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lng - dLng, lat - dLat];
}

// ────────────────────────────────────────────
//  Unified route types
// ────────────────────────────────────────────

export type TravelMode = 'walking' | 'driving' | 'bicycling';

export type DrivingStrategy =
  | 0   // 速度优先（最快路线）
  | 1   // 费用优先（不走收费路段）
  | 2   // 距离优先（最短路线）
  | 4   // 躲避拥堵
  | 5   // 多策略：不走高速
  | 6   // 多策略：不走高速且避免收费
  | 7   // 多策略：不走高速且躲避拥堵
  | 8   // 多策略：不走高速且不走收费且躲避拥堵
  ;

export interface RouteStep {
  instruction: string;     // e.g. "向东步行200米"
  distance: number;        // meters
  duration: number;        // seconds
  polyline: [number, number][];  // WGS-84 [lng, lat] pairs
}

export interface RoutePath {
  distance: number;        // total meters
  duration: number;        // total seconds
  steps: RouteStep[];
  polyline: [number, number][];  // full route WGS-84 [lng, lat] pairs
}

export interface RouteResult {
  origin: [number, number];      // WGS-84 [lng, lat]
  destination: [number, number]; // WGS-84 [lng, lat]
  mode: TravelMode;
  paths: RoutePath[];
}

// ────────────────────────────────────────────
//  Polyline string → WGS-84 coords
// ────────────────────────────────────────────

/** Parse AMap polyline string "lng,lat;lng,lat;..." (GCJ-02) → WGS-84 [lng,lat][] */
function parsePolyline(polylineStr: string): [number, number][] {
  if (!polylineStr) return [];
  return polylineStr.split(';').map((pair) => {
    const [lng, lat] = pair.split(',').map(Number);
    return gcj02ToWgs84(lng, lat);
  });
}

// ────────────────────────────────────────────
//  Walking route
// ────────────────────────────────────────────

async function fetchWalkingRoute(
  originLng: number, originLat: number,
  destLng: number, destLat: number,
): Promise<RoutePath[]> {
  const [oLng, oLat] = wgs84ToGcj02(originLng, originLat);
  const [dLng, dLat] = wgs84ToGcj02(destLng, destLat);

  const url = `${AMAP_API.walking}?key=${AMAP_KEY}&origin=${oLng},${oLat}&destination=${dLng},${dLat}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== '1' || !json.route?.paths?.length) {
    throw new Error(json.info || 'Walking route request failed');
  }

  return json.route.paths.map((p: any) => {
    const steps: RouteStep[] = (p.steps || []).map((s: any) => ({
      instruction: s.instruction || s.action || '',
      distance: Number(s.distance) || 0,
      duration: Number(s.duration) || 0,
      polyline: parsePolyline(s.polyline),
    }));
    const polyline = steps.flatMap((s) => s.polyline);
    return {
      distance: Number(p.distance) || 0,
      duration: Number(p.duration) || 0,
      steps,
      polyline,
    } as RoutePath;
  });
}

// ────────────────────────────────────────────
//  Driving route
// ────────────────────────────────────────────

async function fetchDrivingRoute(
  originLng: number, originLat: number,
  destLng: number, destLat: number,
  strategy: DrivingStrategy = 0,
  waypoints?: [number, number][],    // WGS-84 [lng,lat] 途经点
): Promise<RoutePath[]> {
  const [oLng, oLat] = wgs84ToGcj02(originLng, originLat);
  const [dLng, dLat] = wgs84ToGcj02(destLng, destLat);

  let url = `${AMAP_API.driving}?key=${AMAP_KEY}&origin=${oLng},${oLat}&destination=${dLng},${dLat}&strategy=${strategy}&extensions=all`;

  if (waypoints && waypoints.length > 0) {
    const wpStr = waypoints
      .map(([lng, lat]) => {
        const [gLng, gLat] = wgs84ToGcj02(lng, lat);
        return `${gLng},${gLat}`;
      })
      .join(';');
    url += `&waypoints=${wpStr}`;
  }

  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== '1' || !json.route?.paths?.length) {
    throw new Error(json.info || 'Driving route request failed');
  }

  return json.route.paths.map((p: any) => {
    const steps: RouteStep[] = (p.steps || []).map((s: any) => ({
      instruction: s.instruction || s.action || '',
      distance: Number(s.distance) || 0,
      duration: Number(s.duration) || 0,
      polyline: parsePolyline(s.polyline),
    }));
    const polyline = steps.flatMap((s) => s.polyline);
    return {
      distance: Number(p.distance) || 0,
      duration: Number(p.duration) || 0,
      steps,
      polyline,
    } as RoutePath;
  });
}

// ────────────────────────────────────────────
//  Bicycling route (v4 API)
// ────────────────────────────────────────────

async function fetchBicyclingRoute(
  originLng: number, originLat: number,
  destLng: number, destLat: number,
): Promise<RoutePath[]> {
  const [oLng, oLat] = wgs84ToGcj02(originLng, originLat);
  const [dLng, dLat] = wgs84ToGcj02(destLng, destLat);

  const url = `${AMAP_API.bicycling}?key=${AMAP_KEY}&origin=${oLng},${oLat}&destination=${dLng},${dLat}`;
  const res = await fetch(url);
  const json = await res.json();

  // v4 API uses errcode / data structure
  if (json.errcode !== 0 || !json.data?.paths?.length) {
    throw new Error(json.errmsg || json.info || 'Bicycling route request failed');
  }

  return json.data.paths.map((p: any) => {
    const steps: RouteStep[] = (p.steps || []).map((s: any) => ({
      instruction: s.instruction || s.action || '',
      distance: Number(s.distance) || 0,
      duration: Number(s.duration) || 0,
      polyline: parsePolyline(s.polyline),
    }));
    const polyline = steps.flatMap((s) => s.polyline);
    return {
      distance: Number(p.distance) || 0,
      duration: Number(p.duration) || 0,
      steps,
      polyline,
    } as RoutePath;
  });
}

// ────────────────────────────────────────────
//  Unified public API
// ────────────────────────────────────────────

export interface RoutePlanOptions {
  originLng: number;
  originLat: number;
  destLng: number;
  destLat: number;
  mode: TravelMode;
  strategy?: DrivingStrategy;
  waypoints?: [number, number][];
}

/**
 * Plan a route between two points using AMap.
 * All coordinates are in WGS-84.
 */
export async function planRoute(opts: RoutePlanOptions): Promise<RouteResult> {
  const { originLng, originLat, destLng, destLat, mode, strategy = 0, waypoints } = opts;

  let paths: RoutePath[];
  switch (mode) {
    case 'walking':
      paths = await fetchWalkingRoute(originLng, originLat, destLng, destLat);
      break;
    case 'driving':
      paths = await fetchDrivingRoute(originLng, originLat, destLng, destLat, strategy, waypoints);
      break;
    case 'bicycling':
      paths = await fetchBicyclingRoute(originLng, originLat, destLng, destLat);
      break;
    default:
      throw new Error(`Unsupported travel mode: ${mode}`);
  }

  return {
    origin: [originLng, originLat],
    destination: [destLng, destLat],
    mode,
    paths,
  };
}

// ────────────────────────────────────────────
//  Multi-point trip planner with TSP heuristic
// ────────────────────────────────────────────

import { calculateHaversineDistance } from '../utils';

/**
 * Nearest-neighbor TSP heuristic.
 * Given a start index and a list of [lng, lat] points, returns the
 * optimised visit order (indices into the points array).
 */
export function optimizeWaypointOrder(
  startLng: number, startLat: number,
  points: [number, number][],       // [lng, lat]
): number[] {
  const n = points.length;
  if (n <= 1) return points.map((_, i) => i);

  const visited = new Set<number>();
  const order: number[] = [];
  let curLng = startLng;
  let curLat = startLat;

  for (let i = 0; i < n; i++) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      const d = calculateHaversineDistance(curLat, curLng, points[j][1], points[j][0]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      visited.add(bestIdx);
      order.push(bestIdx);
      curLng = points[bestIdx][0];
      curLat = points[bestIdx][1];
    }
  }
  return order;
}

// ────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────

/** Format seconds → readable string */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs} hr ${remainMins} min` : `${hrs} hr`;
}

/** Format meters → readable string */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Build a deep-link URL for external map apps */
export function buildExternalMapUrl(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  destName: string,
): { amap: string; bmap: string; apple: string } {
  // AMap (高德)
  const [aOLng, aOLat] = wgs84ToGcj02(originLng, originLat);
  const [aDLng, aDLat] = wgs84ToGcj02(destLng, destLat);
  const amap = `https://uri.amap.com/navigation?from=${aOLng},${aOLat},起点&to=${aDLng},${aDLat},${encodeURIComponent(destName)}&mode=car&coordinate=gaode`;

  // Baidu Map
  const bmap = `https://api.map.baidu.com/direction?origin=latlng:${originLat},${originLng}|name:起点&destination=latlng:${destLat},${destLng}|name:${encodeURIComponent(destName)}&coord_type=wgs84&mode=driving&output=html`;

  // Apple Maps
  const apple = `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;

  return { amap, bmap, apple };
}
