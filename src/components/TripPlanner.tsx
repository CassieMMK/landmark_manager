import React, { useState, useMemo } from 'react';
import { Landmark } from '../types';
import {
  Navigation, MapPin, Car, Footprints, Bike,
  AlertCircle, Locate, X, ArrowUpDown,
  Route, Clock, ChevronDown, ChevronUp, List, Star, LogIn,
} from 'lucide-react';
import type { TravelMode, RouteResult, RoutePath } from '../services/amap';
import { planRoute, optimizeWaypointOrder, formatDuration, formatDistance } from '../services/amap';

interface TripPlannerProps {
  landmarks: Landmark[];
  onTripRoute: (segments: RouteResult[]) => void;
  onCenterChange: (lat: number, lng: number) => void;
  showToast: (msg: string) => void;
  onGpsUpdate?: (lat: number, lng: number) => void;
  /** Auto-save: called after every successful plan */
  onAutoSave?: (data: {
    name: string; mode: string;
    waypointIds: string[]; waypointNames: string[];
    useGpsStart: boolean; gpsLat: number | null; gpsLng: number | null;
    segmentsData: RouteResult[];
  }) => void;
  lastSavedTripId?: string | null;
  lastSavedTripFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isLoggedIn?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface TripSegment {
  from: string;
  to: string;
  result: RouteResult;
  path: RoutePath;
}

export default function TripPlanner({
  landmarks,
  onTripRoute,
  onCenterChange,
  showToast,
  onGpsUpdate,
  onAutoSave,
  lastSavedTripId,
  lastSavedTripFavorite,
  onToggleFavorite,
  isLoggedIn,
  mobileOpen = true,
  onMobileClose,
}: TripPlannerProps) {
  const [waypointIds, setWaypointIds] = useState<string[]>([]);
  const [mode, setMode] = useState<TravelMode>('driving');

  // GPS origin
  const [useGpsStart, setUseGpsStart] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Results
  const [segments, setSegments] = useState<TripSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [detailSegIdx, setDetailSegIdx] = useState<number | null>(null);

  const waypointLandmarks = useMemo(
    () => waypointIds.map((id) => landmarks.find((l) => l.id === id)).filter(Boolean) as Landmark[],
    [waypointIds, landmarks],
  );

  const availableLandmarks = useMemo(
    () => landmarks.filter((l) => !waypointIds.includes(l.id)),
    [landmarks, waypointIds],
  );

  const canAdd = waypointIds.length < 5;

  const handleLocate = () => {
    if (!navigator.geolocation) {
      showToast('GPS geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsLat(lat);
        setGpsLng(lng);
        setGpsLoading(false);
        onGpsUpdate?.(lat, lng);
        onCenterChange(lat, lng);
        showToast(`Location acquired: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      (err) => {
        setGpsLoading(false);
        showToast(`Location failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleAddWaypoint = (id: string) => {
    if (!id || waypointIds.includes(id) || waypointIds.length >= 5) return;
    setWaypointIds((prev) => [...prev, id]);
  };

  const handleRemoveWaypoint = (idx: number) => {
    setWaypointIds((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveWaypoint = (idx: number, dir: -1 | 1) => {
    const newArr = [...waypointIds];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    setWaypointIds(newArr);
  };

  const handleOptimize = () => {
    if (waypointLandmarks.length <= 1) return;
    let startLng: number, startLat: number;
    if (useGpsStart && gpsLat !== null && gpsLng !== null) {
      startLng = gpsLng;
      startLat = gpsLat;
    } else {
      startLng = waypointLandmarks[0].longitude;
      startLat = waypointLandmarks[0].latitude;
    }
    const points: [number, number][] = waypointLandmarks.map((l) => [l.longitude, l.latitude]);
    const optimizedOrder = optimizeWaypointOrder(startLng, startLat, points);
    const newIds = optimizedOrder.map((i) => waypointIds[i]);
    setWaypointIds(newIds);
    showToast('Waypoint order optimized (nearest-neighbor).');
  };

  const handlePlanTrip = async () => {
    setError(null);
    if (waypointIds.length < 2) {
      setError('Select at least 2 landmarks to plan a trip.');
      return;
    }

    interface TripPoint { name: string; lng: number; lat: number }
    const points: TripPoint[] = [];

    if (useGpsStart) {
      if (gpsLat === null || gpsLng === null) {
        setError('Please acquire your GPS location first.');
        return;
      }
      points.push({ name: 'Current Location', lng: gpsLng, lat: gpsLat });
    }

    waypointLandmarks.forEach((lm) => {
      points.push({ name: lm.name, lng: lm.longitude, lat: lm.latitude });
    });

    setIsLoading(true);
    try {
      const results: TripSegment[] = [];
      const routeResults: RouteResult[] = [];

      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        const result = await planRoute({
          originLng: from.lng, originLat: from.lat,
          destLng: to.lng, destLat: to.lat,
          mode,
        });
        routeResults.push(result);
        results.push({ from: from.name, to: to.name, result, path: result.paths[0] });
      }

      setSegments(results);
      onTripRoute(routeResults);

      const allLats = points.map((p) => p.lat);
      const allLngs = points.map((p) => p.lng);
      onCenterChange(
        (Math.min(...allLats) + Math.max(...allLats)) / 2,
        (Math.min(...allLngs) + Math.max(...allLngs)) / 2,
      );

      const totalDist = results.reduce((sum, s) => sum + (s.path?.distance || 0), 0);
      const totalTime = results.reduce((sum, s) => sum + (s.path?.duration || 0), 0);
      showToast(`Trip planned — ${results.length} leg(s), ${formatDistance(totalDist)}, approx. ${formatDuration(totalTime)}`);

      // Auto-save to history
      const autoName = `Trip via ${waypointLandmarks.length} stops (${mode})`;
      onAutoSave?.({
        name: autoName,
        mode,
        waypointIds,
        waypointNames: waypointLandmarks.map((l) => l.name),
        useGpsStart,
        gpsLat,
        gpsLng,
        segmentsData: routeResults,
      });
    } catch (e: any) {
      setError(e?.message || 'Trip planning failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSegments([]);
    setError(null);
    onTripRoute([]);
  };

  const totalDistance = segments.reduce((sum, s) => sum + (s.path?.distance || 0), 0);
  const totalDuration = segments.reduce((sum, s) => sum + (s.path?.duration || 0), 0);

  const modeConfig: { key: TravelMode; label: string; icon: React.ReactNode }[] = [
    { key: 'walking',    label: 'Walk', icon: <Footprints className="h-3.5 w-3.5" /> },
    { key: 'driving',    label: 'Drive', icon: <Car className="h-3.5 w-3.5" /> },
    { key: 'bicycling',  label: 'Bike', icon: <Bike className="h-3.5 w-3.5" /> },
  ];

  const detailSeg = detailSegIdx !== null ? segments[detailSegIdx] : null;

  return (
    <>
      <aside className={`
        w-full md:w-[340px] shrink-0 border-r border-[#c3c6d7] bg-white flex flex-col overflow-y-auto
        fixed md:static inset-x-0 bottom-0 md:inset-auto h-[60vh] md:h-full z-[90] md:z-auto
        rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none
        transition-transform duration-300 ease-out
        ${mobileOpen ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0
      `} id="trip-planner-sidebar"
        onTouchStart={(e) => {
          const el = e.currentTarget;
          (el as any)._touchStartY = e.touches[0].clientY;
          (el as any)._scrollTop = el.scrollTop;
        }}
        onTouchMove={(e) => {
          const el = e.currentTarget;
          const deltaY = e.touches[0].clientY - ((el as any)._touchStartY || 0);
          if (deltaY > 0 && (el as any)._scrollTop === 0) {
            (el as any)._swipeDown = deltaY;
          }
        }}
        onTouchEnd={(e) => {
          const el = e.currentTarget;
          if (((el as any)._swipeDown || 0) > 80) {
            onMobileClose?.();
          }
          (el as any)._swipeDown = 0;
        }}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" onClick={onMobileClose} />
        </div>
        {/* Header */}
        <div className="p-6 border-b border-[#c3c6d7] bg-[#f8f9ff]/50">
          <div className="flex items-center gap-3 mb-1.5">
            <Route className="h-5 w-5 text-[#003da6] stroke-[2.5]" />
            <h2 className="text-lg font-bold tracking-tight text-[#003da6]">Trip Planner</h2>
          </div>
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Multi-Stop Itinerary</p>
        </div>

        {/* Not logged in hint */}
        {!isLoggedIn && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
            <LogIn className="h-3.5 w-3.5 shrink-0" />
            <span>Sign in to enable trip history & favorites.</span>
          </div>
        )}

        <div className="flex-grow flex flex-col">
          {/* Mode selector */}
          <div className="px-6 pt-5 pb-4 border-b border-[#c3c6d7]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Travel Mode
            </label>
            <div className="flex gap-2">
              {modeConfig.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                    mode === m.key
                      ? 'bg-[#003da6] text-white border-[#003da6] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#003da6] hover:text-[#003da6]'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Start toggle */}
          <div className="px-6 py-4 border-b border-[#c3c6d7]">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={useGpsStart}
                onChange={(e) => setUseGpsStart(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#003da6] focus:ring-[#003da6]"
              />
              <span className="text-xs font-bold text-gray-700">Start from current location</span>
            </label>
            {useGpsStart && (
              <div className="ml-6 space-y-2">
                <button
                  onClick={handleLocate}
                  disabled={gpsLoading}
                  className="flex items-center gap-2 py-1.5 px-3 bg-[#eef4fe] hover:bg-[#003da6] hover:text-white text-[#003da6] border border-[#003da6]/10 rounded-lg text-[10px] font-bold transition-all"
                >
                  <Locate className={`h-3 w-3 ${gpsLoading ? 'animate-pulse' : ''}`} />
                  {gpsLoading ? 'Locating...' : gpsLat !== null ? 'Re-locate' : 'Get Location'}
                </button>
                {gpsLat !== null && gpsLng !== null && (
                  <p className="text-[10px] text-gray-500 font-mono">
                    {gpsLat.toFixed(5)}, {gpsLng.toFixed(5)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Waypoints list */}
          <div className="px-6 py-4 border-b border-[#c3c6d7]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#003da6]">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-bold tracking-wide uppercase">Stops ({waypointIds.length}/5)</span>
              </div>
              {waypointLandmarks.length > 1 && (
                <button
                  onClick={handleOptimize}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold transition-all border border-amber-200"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  Optimize
                </button>
              )}
            </div>

            <div className="space-y-1.5 mb-3">
              {waypointLandmarks.map((lm, idx) => (
                <div key={lm.id} className="flex items-center gap-2 p-2 bg-[#f8f9ff] border border-gray-100 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-[#003da6] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <span className="flex-grow text-xs font-semibold text-gray-800 truncate">
                    {lm.name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => handleMoveWaypoint(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-[#003da6] disabled:opacity-30 transition-all" title="Move up">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleMoveWaypoint(idx, 1)} disabled={idx === waypointIds.length - 1} className="p-1 text-gray-400 hover:text-[#003da6] disabled:opacity-30 transition-all" title="Move down">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleRemoveWaypoint(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-all" title="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {canAdd && (
              <select
                value=""
                onChange={(e) => handleAddWaypoint(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-dashed border-[#c3c6d7] bg-white rounded-lg outline-none focus:border-[#003da6] text-gray-500"
              >
                <option value="">+ Add a stop...</option>
                {availableLandmarks.map((lm) => (
                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 flex gap-2">
            <button
              onClick={handlePlanTrip}
              disabled={isLoading || waypointIds.length < 2}
              className="flex-1 bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-sm hover:shadow active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Route className="h-3.5 w-3.5 animate-spin" /> Planning...</>
              ) : (
                <><Navigation className="h-3.5 w-3.5" /> Plan Trip</>
              )}
            </button>
            {segments.length > 0 && (
              <button onClick={handleClear} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                Clear
              </button>
            )}
          </div>

          {/* Trip results — compact */}
          {segments.length > 0 && (
            <div className="px-6 pb-6">
              <div className="p-4 bg-[#78fbbb]/10 border border-[#006c47]/20 rounded-lg mb-3">
                <span className="text-[10px] font-bold text-[#006c47] tracking-wider uppercase block mb-2">Trip Summary</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold">Legs</p>
                    <p className="text-base font-extrabold text-gray-900 font-mono">{segments.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold">Distance</p>
                    <p className="text-base font-extrabold text-gray-900 font-mono">{formatDistance(totalDistance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold">Duration</p>
                    <p className="text-base font-extrabold text-gray-900 font-mono">{formatDuration(totalDuration)}</p>
                  </div>
                </div>
              </div>

              {/* ★ Favorite toggle */}
              {isLoggedIn && lastSavedTripId && onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(lastSavedTripId)}
                  className={`w-full mb-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    lastSavedTripFavorite
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${lastSavedTripFavorite ? 'fill-current' : ''}`} />
                  {lastSavedTripFavorite ? 'Favorited' : 'Add to Favorites'}
                </button>
              )}

              {/* Segment cards */}
              <div className="space-y-1.5">
                {segments.map((seg, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#003da6] text-white flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[150px]">
                          {seg.from} → {seg.to}
                        </span>
                      </div>
                      <button
                        onClick={() => setDetailSegIdx(i)}
                        className="p-1 px-2 rounded bg-[#eef4fe] hover:bg-[#003da6] hover:text-white text-[#003da6] text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <List className="h-3 w-3" />
                        Details
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-1.5 ml-7">
                      <span className="flex items-center gap-1"><Route className="h-3 w-3" />{formatDistance(seg.path?.distance || 0)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(seg.path?.duration || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Segment Detail Modal */}
      {detailSeg && detailSegIdx !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm" onClick={() => setDetailSegIdx(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-[#c3c6d7] animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-[#c3c6d7] bg-[#f8f9ff]/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  Leg {detailSegIdx + 1}: {detailSeg.from} → {detailSeg.to}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {detailSeg.path?.steps?.length || 0} steps — {formatDistance(detailSeg.path?.distance || 0)} — {formatDuration(detailSeg.path?.duration || 0)}
                </p>
              </div>
              <button onClick={() => setDetailSegIdx(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-2">
              {(detailSeg.path?.steps || []).map((step, j) => (
                <button
                  key={j}
                  onClick={() => { if (step.polyline.length > 0) { onCenterChange(step.polyline[0][1], step.polyline[0][0]); } }}
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-[#eef4fe] hover:border-[#003da6]/20 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#003da6] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {j + 1}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed">{step.instruction || `Step ${j + 1}`}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1"><Route className="h-3 w-3" />{formatDistance(step.distance)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(step.duration)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
