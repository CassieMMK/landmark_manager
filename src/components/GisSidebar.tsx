import React, { useState } from 'react';
import { Landmark } from '../types';
import { Compass, MapPin, Navigation, Ruler, Plus, Search, AlertCircle } from 'lucide-react';

interface GisSidebarProps {
  landmarks: Landmark[];
  searchLat: string;
  setSearchLat: (val: string) => void;
  searchLng: string;
  setSearchLng: (val: string) => void;
  searchRadius: string;
  setSearchRadius: (val: string) => void;
  onSearchNearby: () => void;
  onClearNearby: () => void;
  nearbyResults: { landmark: Landmark; distanceKm: number }[] | null;
  selectedFromLandmarkId: string;
  setSelectedFromLandmarkId: (id: string) => void;
  selectedToLandmarkId: string;
  setSelectedToLandmarkId: (id: string) => void;
  calculatedDistance: number | null;
  distanceError: string | null;
  onCalculateDistance: () => void;
  onResultClick: (landmark: Landmark) => void;
  onAddClick: () => void;
}

export default function GisSidebar({
  landmarks,
  searchLat,
  setSearchLat,
  searchLng,
  setSearchLng,
  searchRadius,
  setSearchRadius,
  onSearchNearby,
  onClearNearby,
  nearbyResults,
  selectedFromLandmarkId,
  setSelectedFromLandmarkId,
  selectedToLandmarkId,
  setSelectedToLandmarkId,
  calculatedDistance,
  distanceError,
  onCalculateDistance,
  onResultClick,
  onAddClick,
}: GisSidebarProps) {
  const [activeTool, setActiveTool] = useState<'search' | 'distance'>('search');
  const [latError, setLatError] = useState<string | null>(null);
  const [lngError, setLngError] = useState<string | null>(null);

  const handleLatChange = (val: string) => {
    setSearchLat(val);
    const num = parseFloat(val);
    if (val !== '' && (isNaN(num) || num < -90 || num > 90)) {
      setLatError('Latitude must be between -90 and 90');
    } else {
      setLatError(null);
    }
  };

  const handleLngChange = (val: string) => {
    setSearchLng(val);
    const num = parseFloat(val);
    if (val !== '' && (isNaN(num) || num < -180 || num > 180)) {
      setLngError('Longitude must be between -180 and 180');
    } else {
      setLngError(null);
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (latError || lngError) return;
    onSearchNearby();
  };

  return (
    <aside className="w-[320px] shrink-0 border-r border-[#c3c6d7] bg-white flex flex-col h-full overflow-y-auto" id="gis-sidebar">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-[#c3c6d7] bg-[#f8f9ff]/50">
        <div className="flex items-center gap-3 mb-1.5">
          <Compass className="h-5 w-5 text-[#003da6] stroke-[2.5]" />
          <h2 className="text-lg font-bold tracking-tight text-[#003da6]">GIS Tools</h2>
        </div>
        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Precision Geodata</p>
      </div>

      <div className="flex-grow flex flex-col">
        {/* Navigation Tools Tab */}
        <div className="border-b border-[#c3c6d7] flex">
          <button
            onClick={() => setActiveTool('search')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTool === 'search'
                ? 'text-[#003da6] border-[#003da6] bg-blue-50/20'
                : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            Nearby Search
          </button>
          <button
            onClick={() => setActiveTool('distance')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTool === 'distance'
                ? 'text-[#003da6] border-[#003da6] bg-blue-50/20'
                : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            Distance Metric
          </button>
        </div>

        {/* Dynamic Tool Config content */}
        {activeTool === 'search' ? (
          <div className="p-6 border-b border-[#c3c6d7] flex-grow" id="nearby-search-pane">
            <div className="flex items-center gap-2.5 text-[#003da6] pb-1 bg-[#003da6]/5 -mx-6 px-6 py-3 mb-4 border-l-4 border-[#003da6]">
              <Search className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Search Area</span>
            </div>

            <form onSubmit={handleSearchClick} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={searchLat}
                  onChange={(e) => handleLatChange(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border bg-[#f8f9ff] rounded-lg outline-none transition-all ${
                    latError ? 'border-red-500 outline-red-500' : 'border-[#c3c6d7] focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20'
                  }`}
                  placeholder="e.g. 40.7128"
                  required
                />
                {latError && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" /> {latError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={searchLng}
                  onChange={(e) => handleLngChange(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border bg-[#f8f9ff] rounded-lg outline-none transition-all ${
                    lngError ? 'border-red-500 outline-red-500' : 'border-[#c3c6d7] focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20'
                  }`}
                  placeholder="e.g. -74.0060"
                  required
                />
                {lngError && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" /> {lngError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Radius (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="40000"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 outline-none transition-all"
                  placeholder="e.g. 10"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!!(latError || lngError)}
                className="w-full bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-sm hover:shadow active:scale-98 transition-all"
              >
                Execute Scan
              </button>
            </form>

            {/* Nearby search results */}
            {nearbyResults !== null && (
              <div className="mt-6 space-y-3" id="scan-results">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    Nearby Results ({nearbyResults.length})
                  </h4>
                  <button
                    onClick={onClearNearby}
                    className="text-[10px] font-mono font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {nearbyResults.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2 bg-gray-50 rounded text-center">
                      No landmarks in search radius
                    </p>
                  ) : (
                    nearbyResults.map(({ landmark, distanceKm }) => (
                      <button
                        key={landmark.id}
                        onClick={() => onResultClick(landmark)}
                        className="w-full p-2.5 bg-[#f8f9ff] hover:bg-[#eef4fe] border border-gray-100 hover:border-[#c3c6d7] rounded-lg flex justify-between items-center text-left transition-all group"
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs font-bold text-gray-900 group-hover:text-[#003da6] truncate">
                            {landmark.name}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono truncate">{landmark.geohash}</p>
                        </div>
                        <span className="text-xs font-bold text-[#003da6] font-mono shrink-0">
                          {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)}m` : `${distanceKm.toFixed(1)} km`}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 border-b border-[#c3c6d7] flex-grow" id="distance-tool-pane">
            <div className="flex items-center gap-2.5 text-[#003da6] pb-1 bg-[#003da6]/5 -mx-6 px-6 py-3 mb-4 border-l-4 border-[#003da6]">
              <Ruler className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Distance Meter</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  From Landmark
                </label>
                <select
                  value={selectedFromLandmarkId}
                  onChange={(e) => setSelectedFromLandmarkId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
                >
                  <option value="">-- Choose Point A --</option>
                  {landmarks.map((landmark) => (
                    <option key={landmark.id} value={landmark.id}>
                      {landmark.name} ({landmark.latitude.toFixed(3)}, {landmark.longitude.toFixed(3)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  To Landmark
                </label>
                <select
                  value={selectedToLandmarkId}
                  onChange={(e) => setSelectedToLandmarkId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6]"
                >
                  <option value="">-- Choose Point B --</option>
                  {landmarks.map((landmark) => (
                    <option key={landmark.id} value={landmark.id}>
                      {landmark.name} ({landmark.latitude.toFixed(3)}, {landmark.longitude.toFixed(3)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={onCalculateDistance}
                disabled={!selectedFromLandmarkId || !selectedToLandmarkId}
                className="w-full bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-sm hover:shadow active:scale-98 transition-all"
              >
                Calculate Range
              </button>

              {distanceError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {distanceError}
                </div>
              )}

              {calculatedDistance !== null && (
                <div className="p-4 bg-[#78fbbb]/10 border border-[#006c47]/20 rounded-lg text-center" id="distance-result">
                  <span className="text-[10px] font-bold text-[#006c47] tracking-wider uppercase block mb-1">
                    Haversine Distance
                  </span>
                  <span className="text-xl font-extrabold text-gray-900 font-mono">
                    {calculatedDistance < 1 ? `${(calculatedDistance * 1000).toFixed(0)} meters` : `${calculatedDistance.toFixed(3)} km`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Footer Link Button */}
        <div className="p-6 mt-auto">
          <button
            onClick={onAddClick}
            className="w-full bg-[#003da6] hover:bg-[#0052d9] text-white py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-98"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Add New Landmark
          </button>
        </div>
      </div>
    </aside>
  );
}
