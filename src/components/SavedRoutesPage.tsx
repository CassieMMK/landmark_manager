import React, { useState } from 'react';
import { SavedRoute, SavedTrip, Landmark } from '../types';
import {
  Route, Navigation, Trash2, Clock, MapPin,
  Footprints, Car, Bike, AlertTriangle, X, Play, Star,
} from 'lucide-react';
import { formatDistance, formatDuration } from '../services/amap';
import type { RouteResult } from '../services/amap';

interface SavedRoutesPageProps {
  savedRoutes: SavedRoute[];
  savedTrips: SavedTrip[];
  landmarks: Landmark[];
  onDeleteRoute: (id: string) => void;
  onDeleteTrip: (id: string) => void;
  onUseRoute: (route: SavedRoute) => void;
  onUseTrip: (trip: SavedTrip) => void;
  onToggleRouteFavorite: (id: string) => void;
  onToggleTripFavorite: (id: string) => void;
  showToast: (msg: string) => void;
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

const formatTime = (iso?: string) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

export default function SavedRoutesPage({
  savedRoutes,
  savedTrips,
  landmarks,
  onDeleteRoute,
  onDeleteTrip,
  onUseRoute,
  onUseTrip,
  onToggleRouteFavorite,
  onToggleTripFavorite,
  showToast,
}: SavedRoutesPageProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'route' | 'trip'; id: string; name: string } | null>(null);

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'route') onDeleteRoute(deleteConfirm.id);
    else onDeleteTrip(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="flex-grow max-w-7xl w-full mx-auto p-6 sm:p-8 bg-[#f8f9ff]">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">Browsing History</h1>
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{savedRoutes.length}</span> route(s) and{' '}
          <span className="font-bold text-gray-800">{savedTrips.length}</span> trip(s) recorded.
          {' '}Routes and trips are saved automatically after each plan.
        </p>
      </div>

      {/* ── Saved Routes ── */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#003da6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Point-to-Point Routes
        </h2>

        {savedRoutes.length === 0 ? (
          <div className="bg-white border border-[#c3c6d7] rounded-xl p-8 text-center">
            <p className="text-xs text-gray-500">No routes recorded yet. Plan a route and it will be saved here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedRoutes.map((r) => {
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
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatTime(r.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleRouteFavorite(r.id)}
                        className={`p-1.5 rounded-full transition-all ${
                          r.is_favorite
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title={r.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`h-4 w-4 ${r.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => onUseRoute(r)}
                        className="px-3 py-1.5 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" /> Use
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'route', id: r.id, name: r.name })}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Saved Trips ── */}
      <div>
        <h2 className="text-sm font-bold text-[#003da6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Route className="h-4 w-4" />
          Multi-Stop Trips
        </h2>

        {savedTrips.length === 0 ? (
          <div className="bg-white border border-[#c3c6d7] rounded-xl p-8 text-center">
            <p className="text-xs text-gray-500">No trips recorded yet. Plan a multi-stop trip and it will be saved here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedTrips.map((t) => {
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
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatTime(t.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleTripFavorite(t.id)}
                        className={`p-1.5 rounded-full transition-all ${
                          t.is_favorite
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title={t.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`h-4 w-4 ${t.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => onUseTrip(t)}
                        className="px-3 py-1.5 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" /> Use
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'trip', id: t.id, name: t.name })}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-100">
                <AlertTriangle className="h-5.5 w-5.5 stroke-[2]" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-2">
                Delete {deleteConfirm.type === 'route' ? 'Route' : 'Trip'}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteConfirm.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="bg-[#f8f9ff]/80 border-t border-gray-100 px-6 py-4 flex gap-3 flex-row-reverse">
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2 bg-white border border-[#c3c6d7] text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
