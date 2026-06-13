import React from 'react';
import { Landmark, SavedRoute, SavedTrip } from '../types';
import {
  Heart, Navigation, MapPin, Star, Play,
  Route, Clock, Footprints, Car, Bike,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDistance, formatDuration } from '../services/amap';
import type { RouteResult } from '../services/amap';

interface FavoritesPageProps {
  landmarks: Landmark[];
  onNavigateTo: (landmarkId: string) => void;
  showToast: (msg: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (landmarkId: string) => void;
  // Route/trip favorites
  savedRoutes: SavedRoute[];
  savedTrips: SavedTrip[];
  onToggleRouteFavorite: (id: string) => void;
  onToggleTripFavorite: (id: string) => void;
  onUseRoute: (route: SavedRoute) => void;
  onUseTrip: (trip: SavedTrip) => void;
}

const modeIcon = (mode: string) => {
  switch (mode) {
    case 'walking':   return <Footprints className="h-3.5 w-3.5" />;
    case 'driving':   return <Car className="h-3.5 w-3.5" />;
    case 'bicycling':  return <Bike className="h-3.5 w-3.5" />;
    default:          return <Route className="h-3.5 w-3.5" />;
  }
};

const modeLabel = (mode: string) => {
  switch (mode) {
    case 'walking':   return 'Walk';
    case 'driving':   return 'Drive';
    case 'bicycling':  return 'Bike';
    default:          return mode;
  }
};

export default function FavoritesPage({
  landmarks,
  onNavigateTo,
  showToast,
  favoriteIds,
  onToggleFavorite,
  savedRoutes,
  savedTrips,
  onToggleRouteFavorite,
  onToggleTripFavorite,
  onUseRoute,
  onUseTrip,
}: FavoritesPageProps) {
  const { user } = useAuth();

  const favoritedLandmarks = landmarks.filter((l) => favoriteIds.has(l.id));
  const favoritedRoutes = savedRoutes.filter((r) => r.is_favorite);
  const favoritedTrips = savedTrips.filter((t) => t.is_favorite);
  const totalCount = favoritedLandmarks.length + favoritedRoutes.length + favoritedTrips.length;

  return (
    <div className="flex-grow max-w-7xl w-full mx-auto p-6 sm:p-8 bg-[#f8f9ff]">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">My Favorites</h1>
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{totalCount}</span> item(s) in your collection.
        </p>
      </div>

      {/* ── Landmark Favorites ── */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#003da6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Landmarks ({favoritedLandmarks.length})
        </h2>

        {favoritedLandmarks.length === 0 ? (
          <div className="bg-white border border-[#c3c6d7] rounded-xl p-8 text-center">
            <p className="text-xs text-gray-500">
              No favorite landmarks yet. Click the heart icon on any landmark to add it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoritedLandmarks.map((lm) => (
              <div
                key={lm.id}
                className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{lm.name}</h3>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {lm.category}
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleFavorite(lm.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Latitude</p>
                      <p className="text-xs font-mono text-gray-700">{lm.latitude.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Longitude</p>
                      <p className="text-xs font-mono text-gray-700">{lm.longitude.toFixed(5)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Geohash</p>
                      <span className="inline-block px-2 py-0.5 bg-[#0052d9]/10 text-[#003da6] font-semibold rounded font-mono text-[11px] border border-blue-50">
                        {lm.geohash}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTo(lm.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-50 hover:bg-green-500 text-green-700 hover:text-white border border-green-200 hover:border-green-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigate Here
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Route Favorites ── */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#003da6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Routes ({favoritedRoutes.length})
        </h2>

        {favoritedRoutes.length === 0 ? (
          <div className="bg-white border border-[#c3c6d7] rounded-xl p-8 text-center">
            <p className="text-xs text-gray-500">
              No favorite routes yet. Tap the star on any route in Browsing History to add it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favoritedRoutes.map((r) => {
              const routeData = r.route_data as RouteResult | null;
              const path = routeData?.paths?.[0];
              return (
                <div key={r.id} className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-grow">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{r.name}</h3>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded font-bold text-[#003da6]">
                          {modeIcon(r.mode)} {modeLabel(r.mode)}
                        </span>
                        {path && (
                          <>
                            <span className="flex items-center gap-1 font-mono">
                              <Route className="h-3 w-3" /> {formatDistance(path.distance)}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" /> {formatDuration(path.duration)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{r.origin_name} → {r.dest_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleRouteFavorite(r.id)}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-full transition-all"
                        title="Remove from favorites"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                      <button
                        onClick={() => onUseRoute(r)}
                        className="px-3 py-1.5 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" /> Use
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Trip Favorites ── */}
      <div>
        <h2 className="text-sm font-bold text-[#003da6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Route className="h-4 w-4" />
          Trips ({favoritedTrips.length})
        </h2>

        {favoritedTrips.length === 0 ? (
          <div className="bg-white border border-[#c3c6d7] rounded-xl p-8 text-center">
            <p className="text-xs text-gray-500">
              No favorite trips yet. Tap the star on any trip in Browsing History to add it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favoritedTrips.map((t) => {
              const segs = (t.segments_data || []) as RouteResult[];
              const totalDist = segs.reduce((s, seg) => s + (seg.paths?.[0]?.distance || 0), 0);
              const totalDur = segs.reduce((s, seg) => s + (seg.paths?.[0]?.duration || 0), 0);
              return (
                <div key={t.id} className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-grow">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{t.name}</h3>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded font-bold text-[#003da6]">
                          {modeIcon(t.mode)} {modeLabel(t.mode)}
                        </span>
                        <span className="font-bold">{t.waypoint_names.length} stops</span>
                        {totalDist > 0 && (
                          <>
                            <span className="flex items-center gap-1 font-mono">
                              <Route className="h-3 w-3" /> {formatDistance(totalDist)}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" /> {formatDuration(totalDur)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {t.waypoint_names.join(' → ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleTripFavorite(t.id)}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-full transition-all"
                        title="Remove from favorites"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                      <button
                        onClick={() => onUseTrip(t)}
                        className="px-3 py-1.5 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" /> Use
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
