import React, { useState } from 'react';
import { Landmark } from '../types';
import {
  Navigation, MapPin, Car, Footprints, Bike,
  AlertCircle, ChevronDown, ChevronUp,
  Locate, ExternalLink, Clock, Route, X, List, Star, LogIn,
} from 'lucide-react';
import type { TravelMode, DrivingStrategy, RouteResult, RoutePath } from '../services/amap';
import { planRoute, formatDuration, formatDistance, buildExternalMapUrl } from '../services/amap';

interface RoutePlannerProps {
  landmarks: Landmark[];
  onRouteResult: (result: RouteResult | null) => void;
  onCenterChange: (lat: number, lng: number) => void;
  showToast: (msg: string) => void;
  initialDestId?: string | null;
  initialOriginId?: string | null;
  onGpsUpdate?: (lat: number, lng: number) => void;
  /** Auto-save: called after every successful plan (App handles DB insert) */
  onAutoSave?: (data: {
    name: string; mode: string;
    originLat: number; originLng: number;
    destLat: number; destLng: number;
    originName: string; destName: string;
    strategy: number; routeData: RouteResult;
  }) => void;
  /** Toggle favorite on the last auto-saved record */
  lastSavedRouteId?: string | null;
  lastSavedRouteFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isLoggedIn?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type OriginType = 'gps' | 'landmark' | 'manual';

// Mode-specific preference options
type RoutePreference = number;

const WALKING_PREFERENCES: { value: RoutePreference; label: string }[] = [
  { value: 0, label: 'Fastest Route' },
  { value: 1, label: 'Shortest Route' },
];

const DRIVING_PREFERENCES: { value: RoutePreference; label: string }[] = [
  { value: 0, label: 'Fastest Route' },
  { value: 2, label: 'Shortest Route' },
  { value: 1, label: 'Avoid Tolls' },
  { value: 4, label: 'Avoid Congestion' },
  { value: 5, label: 'Avoid Highways' },
  { value: 8, label: 'No Highway / No Toll / No Congestion' },
];

const BICYCLING_PREFERENCES: { value: RoutePreference; label: string }[] = [
  { value: 0, label: 'Recommended Route' },
];

export default function RoutePlanner({
  landmarks,
  onRouteResult,
  onCenterChange,
  showToast,
  initialDestId,
  initialOriginId,
  onGpsUpdate,
  onAutoSave,
  lastSavedRouteId,
  lastSavedRouteFavorite,
  onToggleFavorite,
  isLoggedIn,
  mobileOpen = true,
  onMobileClose,
}: RoutePlannerProps) {
  // Origin
  const [originType, setOriginType] = useState<OriginType>(initialOriginId ? 'landmark' : 'gps');
  const [originLandmarkId, setOriginLandmarkId] = useState<string>(initialOriginId || '');
  const [manualOriginLat, setManualOriginLat] = useState<string>('');
  const [manualOriginLng, setManualOriginLng] = useState<string>('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Destination
  const [destLandmarkId, setDestLandmarkId] = useState<string>(initialDestId || '');

  // Mode & strategy
  const [mode, setMode] = useState<TravelMode>('driving');
  const [strategy, setStrategy] = useState<RoutePreference>(0);

  // Results
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [selectedPathIdx, setSelectedPathIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // External map links
  const [showExternalLinks, setShowExternalLinks] = useState(false);

  // Steps detail modal
  const [showStepsModal, setShowStepsModal] = useState(false);

  // Reset strategy when mode changes
  const handleModeChange = (newMode: TravelMode) => {
    setMode(newMode);
    setStrategy(0);
  };

  // Get preferences for current mode
  const getPreferences = () => {
    switch (mode) {
      case 'walking':   return WALKING_PREFERENCES;
      case 'driving':   return DRIVING_PREFERENCES;
      case 'bicycling': return BICYCLING_PREFERENCES;
    }
  };

  // GPS locate
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

  // Resolve origin coords
  const getOriginCoords = (): [number, number] | null => {
    if (originType === 'gps') {
      if (gpsLat !== null && gpsLng !== null) return [gpsLng, gpsLat];
      return null;
    }
    if (originType === 'landmark') {
      const lm = landmarks.find((l) => l.id === originLandmarkId);
      if (lm) return [lm.longitude, lm.latitude];
      return null;
    }
    const lat = parseFloat(manualOriginLat);
    const lng = parseFloat(manualOriginLng);
    if (!isNaN(lat) && !isNaN(lng)) return [lng, lat];
    return null;
  };

  // Submit
  const handlePlanRoute = async () => {
    setError(null);
    const origin = getOriginCoords();
    if (!origin) {
      setError('Please set an origin location first.');
      return;
    }
    const dest = landmarks.find((l) => l.id === destLandmarkId);
    if (!dest) {
      setError('Please select a destination landmark.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await planRoute({
        originLng: origin[0],
        originLat: origin[1],
        destLng: dest.longitude,
        destLat: dest.latitude,
        mode,
        strategy: mode === 'driving' ? strategy as DrivingStrategy : undefined,
      });
      setRouteResult(result);
      setSelectedPathIdx(0);
      onRouteResult(result);

      const midLat = (origin[1] + dest.latitude) / 2;
      const midLng = (origin[0] + dest.longitude) / 2;
      onCenterChange(midLat, midLng);

      showToast(`Route planned — ${formatDistance(result.paths[0]?.distance || 0)}, approx. ${formatDuration(result.paths[0]?.duration || 0)}`);

      // Auto-save to history (App handles login check & DB)
      const originLm = originType === 'landmark' ? landmarks.find((l) => l.id === originLandmarkId) : null;
      const autoName = `${originLm?.name || 'GPS'} → ${dest.name} (${mode})`;
      onAutoSave?.({
        name: autoName,
        mode,
        originLat: origin[1],
        originLng: origin[0],
        destLat: dest.latitude,
        destLng: dest.longitude,
        originName: originLm?.name || 'GPS Location',
        destName: dest.name,
        strategy,
        routeData: result,
      });
    } catch (e: any) {
      setError(e?.message || 'Route planning failed.');
      onRouteResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setRouteResult(null);
    setError(null);
    onRouteResult(null);
  };

  const modeConfig: { key: TravelMode; label: string; icon: React.ReactNode }[] = [
    { key: 'walking',   label: 'Walk',  icon: <Footprints className="h-3.5 w-3.5" /> },
    { key: 'driving',   label: 'Drive', icon: <Car className="h-3.5 w-3.5" /> },
    { key: 'bicycling',  label: 'Bike',  icon: <Bike className="h-3.5 w-3.5" /> },
  ];

  const currentPath: RoutePath | null = routeResult?.paths[selectedPathIdx] || null;
  const preferences = getPreferences();

  return (
    <>
      <aside className={`
        w-full md:w-[340px] shrink-0 border-r border-[#c3c6d7] bg-white flex flex-col overflow-y-auto
        fixed md:static inset-x-0 bottom-0 md:inset-auto h-[60vh] md:h-full z-[90] md:z-auto
        rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none
        transition-transform duration-300 ease-out
        ${mobileOpen ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0
      `} id="route-planner-sidebar"
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
            <Navigation className="h-5 w-5 text-[#003da6] stroke-[2.5]" />
            <h2 className="text-lg font-bold tracking-tight text-[#003da6]">Route Planning</h2>
          </div>
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Point-to-Point Navigation</p>
        </div>

        {/* Not logged in hint */}
        {!isLoggedIn && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
            <LogIn className="h-3.5 w-3.5 shrink-0" />
            <span>Sign in to enable route history & favorites.</span>
          </div>
        )}

        <div className="flex-grow flex flex-col">
          {/* Mode Selector */}
          <div className="px-6 pt-5 pb-4 border-b border-[#c3c6d7]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Travel Mode
            </label>
            <div className="flex gap-2">
              {modeConfig.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModeChange(m.key)}
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

          {/* Route Preference */}
          {preferences.length > 1 && (
            <div className="px-6 py-4 border-b border-[#c3c6d7]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                Route Preference
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6] text-xs"
              >
                {preferences.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Origin */}
          <div className="px-6 py-4 border-b border-[#c3c6d7]">
            <div className="flex items-center gap-2 text-[#006c47] mb-3 bg-[#006c47]/5 -mx-6 px-6 py-2.5 border-l-4 border-[#006c47]">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Origin</span>
            </div>

            <div className="flex gap-1.5 mb-3">
              {(['gps', 'landmark', 'manual'] as OriginType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setOriginType(t)}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    originType === t
                      ? 'bg-[#003da6] text-white border-[#003da6]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {t === 'gps' ? 'GPS' : t === 'landmark' ? 'Landmark' : 'Manual'}
                </button>
              ))}
            </div>

            {originType === 'gps' && (
              <div className="space-y-2">
                <button
                  onClick={handleLocate}
                  disabled={gpsLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-[#eef4fe] hover:bg-[#003da6] hover:text-white text-[#003da6] border border-[#003da6]/10 rounded-lg text-xs font-bold transition-all"
                >
                  <Locate className={`h-3.5 w-3.5 ${gpsLoading ? 'animate-pulse' : ''}`} />
                  {gpsLoading ? 'Locating...' : gpsLat !== null ? 'Re-locate' : 'Get Current Location'}
                </button>
                {gpsLat !== null && gpsLng !== null && (
                  <p className="text-[11px] text-gray-600 font-mono text-center">
                    {gpsLat.toFixed(5)}, {gpsLng.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {originType === 'landmark' && (
              <select
                value={originLandmarkId}
                onChange={(e) => setOriginLandmarkId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
              >
                <option value="">-- Select Origin Landmark --</option>
                {landmarks.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name} ({lm.latitude.toFixed(3)}, {lm.longitude.toFixed(3)})
                  </option>
                ))}
              </select>
            )}

            {originType === 'manual' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={manualOriginLat}
                  onChange={(e) => setManualOriginLat(e.target.value)}
                  placeholder="Latitude"
                  className="px-3 py-2 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
                />
                <input
                  type="text"
                  value={manualOriginLng}
                  onChange={(e) => setManualOriginLng(e.target.value)}
                  placeholder="Longitude"
                  className="px-3 py-2 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
                />
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="px-6 py-4 border-b border-[#c3c6d7]">
            <div className="flex items-center gap-2 text-[#822600] mb-3 bg-[#822600]/5 -mx-6 px-6 py-2.5 border-l-4 border-[#822600]">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Destination</span>
            </div>
            <select
              value={destLandmarkId}
              onChange={(e) => setDestLandmarkId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
            >
              <option value="">-- Select Destination --</option>
              {landmarks.map((lm) => (
                <option key={lm.id} value={lm.id}>
                  {lm.name} ({lm.latitude.toFixed(3)}, {lm.longitude.toFixed(3)})
                </option>
              ))}
            </select>
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
              onClick={handlePlanRoute}
              disabled={isLoading}
              className="flex-1 bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-sm hover:shadow active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Route className="h-3.5 w-3.5 animate-spin" /> Planning...</>
              ) : (
                <><Navigation className="h-3.5 w-3.5" /> Plan Route</>
              )}
            </button>
            {routeResult && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          {/* Route Result — compact summary */}
          {currentPath && routeResult && (
            <div className="px-6 pb-6">
              {/* Summary card */}
              <div className="p-4 bg-[#78fbbb]/10 border border-[#006c47]/20 rounded-lg mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#006c47] tracking-wider uppercase">Route Overview</span>
                  {routeResult.paths.length > 1 && (
                    <div className="flex gap-1">
                      {routeResult.paths.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedPathIdx(i)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            selectedPathIdx === i
                              ? 'bg-[#006c47] text-white'
                              : 'bg-white text-gray-500 border border-gray-200 hover:border-[#006c47]'
                          }`}
                        >
                          Option {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Distance</p>
                    <p className="text-lg font-extrabold text-gray-900 font-mono">
                      {formatDistance(currentPath.distance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Duration</p>
                    <p className="text-lg font-extrabold text-gray-900 font-mono">
                      {formatDuration(currentPath.duration)}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Directions button */}
              <button
                onClick={() => setShowStepsModal(true)}
                className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#eef4fe] border border-[#003da6]/10 rounded-lg text-xs font-bold text-[#003da6] hover:bg-[#003da6] hover:text-white transition-all"
              >
                <List className="h-3.5 w-3.5" />
                View Directions ({currentPath.steps.length} steps)
              </button>

              {/* ★ Favorite toggle (only when logged in and route was auto-saved) */}
              {isLoggedIn && lastSavedRouteId && onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(lastSavedRouteId)}
                  className={`w-full mb-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    lastSavedRouteFavorite
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${lastSavedRouteFavorite ? 'fill-current' : ''}`} />
                  {lastSavedRouteFavorite ? 'Favorited' : 'Add to Favorites'}
                </button>
              )}

              {/* External map links */}
              <button
                onClick={() => setShowExternalLinks(!showExternalLinks)}
                className="w-full mb-2 flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in External Map
                </span>
                {showExternalLinks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showExternalLinks && (
                <div className="space-y-1.5">
                  {(() => {
                    const urls = buildExternalMapUrl(
                      routeResult.origin[1], routeResult.origin[0],
                      routeResult.destination[1], routeResult.destination[0],
                      landmarks.find((l) => l.id === destLandmarkId)?.name || 'Destination',
                    );
                    return (
                      <>
                        <a href={urls.amap} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-[#003da6] hover:bg-blue-100 transition-all">
                          AMap (Gaode)
                        </a>
                        <a href={urls.bmap} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-[#003da6] hover:bg-blue-100 transition-all">
                          Baidu Maps
                        </a>
                        <a href={urls.apple} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-[#003da6] hover:bg-blue-100 transition-all">
                          Apple Maps
                        </a>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Steps Detail Modal */}
      {showStepsModal && currentPath && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm" onClick={() => setShowStepsModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-[#c3c6d7] animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-[#c3c6d7] bg-[#f8f9ff]/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Turn-by-Turn Directions</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {currentPath.steps.length} steps — {formatDistance(currentPath.distance)} — {formatDuration(currentPath.duration)}
                </p>
              </div>
              <button onClick={() => setShowStepsModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-2">
              {currentPath.steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => { if (step.polyline.length > 0) { onCenterChange(step.polyline[0][1], step.polyline[0][0]); } }}
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-[#eef4fe] hover:border-[#003da6]/20 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#003da6] text-white flex items-center justify-center text-[11px] font-bold shrink-0 group-hover:bg-[#0052d9] transition-colors">
                      {i + 1}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed">{step.instruction || `Step ${i + 1}`}</p>
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
