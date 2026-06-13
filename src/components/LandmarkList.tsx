import React, { useState, useMemo } from 'react';
import { Landmark } from '../types';
import {
  Search, Trash2, ChevronLeft, ChevronRight, MapPin, AlertTriangle, Plus,
  Compass, Pencil, RefreshCw, Info, Navigation, Heart,
} from 'lucide-react';
import { LANDMARK_CATEGORIES } from '../utils';

interface LandmarkListProps {
  landmarks: Landmark[];
  isLoading?: boolean;
  loadError?: string | null;
  onDeleteLandmark: (id: string) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onEditLandmark: (landmark: Landmark) => void;
  setTab: (tab: 'home' | 'list' | 'add') => void;
  onSetNearbyInputs: (lat: number, lng: number) => void;
  onNavigateTo?: (landmarkId: string) => void;
  onNavigateFrom?: (landmarkId: string) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (landmarkId: string) => void;
}

export default function LandmarkList({
  landmarks,
  isLoading = false,
  loadError = null,
  onDeleteLandmark,
  onSelectLandmark,
  onEditLandmark,
  setTab,
  onSetNearbyInputs,
  onNavigateTo,
  onNavigateFrom,
  favoriteIds = new Set(),
  onToggleFavorite,
}: LandmarkListProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(7);

  const [deleteCandidate, setDeleteCandidate] = useState<Landmark | null>(null);
  const [detailsLandmark, setDetailsLandmark] = useState<Landmark | null>(null);

  const filteredLandmarks = useMemo(() => {
    return landmarks.filter((landmark) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        landmark.name.toLowerCase().includes(term) ||
        landmark.geohash.toLowerCase().includes(term) ||
        landmark.category.toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === 'All Categories' || landmark.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [landmarks, searchTerm, selectedCategory]);

  const totalEntries = filteredLandmarks.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const paginatedLandmarks = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return filteredLandmarks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLandmarks, activePage, itemsPerPage]);

  const startEntry = (activePage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(activePage * itemsPerPage, totalEntries);

  const handleDeleteConfirm = () => {
    if (!deleteCandidate) return;
    onDeleteLandmark(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  const handleFocusOnMap = (landmark: Landmark) => {
    onSelectLandmark(landmark);
    setTab('home');
  };

  const handleQueryNearby = (landmark: Landmark) => {
    onSetNearbyInputs(landmark.latitude, landmark.longitude);
    setTab('home');
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto" id="landmark-list-workspace">

      <aside className="w-full md:w-[260px] border-b md:border-b-0 md:border-r border-[#c3c6d7] bg-white p-6 flex flex-col shrink-0">
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#003da6]">GIS Tools</h2>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Precision Geodata</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1 mb-2">
            Operations
          </div>
          <button
            onClick={() => setTab('home')}
            className="flex items-center gap-3 text-left w-full text-xs font-semibold text-gray-600 hover:text-[#003da6] hover:bg-gray-50 p-2.5 rounded-lg transition-colors border border-transparent hover:border-gray-100"
          >
            <Search className="h-4 w-4 text-gray-400" />
            Search Nearby Area
          </button>

          <button
            onClick={() => setTab('home')}
            className="flex items-center gap-3 text-left w-full text-xs font-semibold text-gray-600 hover:text-[#003da6] hover:bg-gray-50 p-2.5 rounded-lg transition-colors border border-transparent hover:border-gray-100"
          >
            <Compass className="h-4 w-4 text-gray-400" />
            Distance Metrics
          </button>
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={() => setTab('add')}
            className="w-full bg-[#eef4fe] hover:bg-[#0052d9] text-[#003da6] hover:text-white border border-[#003da6]/10 py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-98"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            New Landmark
          </button>
        </div>
      </aside>

      <main className="flex-grow p-6 sm:p-8 bg-[#f8f9ff]">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">Stored Landmarks</h1>
            <p className="text-sm text-gray-500">
              Manage your Supabase landmarks table — currently <span className="font-bold text-gray-800">{landmarks.length}</span> record(s).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3" id="filters-row">
            <div className="relative shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 bg-white border border-[#c3c6d7] rounded-lg w-full sm:w-56 focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 outline-none transition-all text-xs"
                placeholder="Search by name, category, or geohash..."
              />
            </div>

            <div className="relative truncate">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-[#c3c6d7] hover:bg-gray-50 text-gray-700 px-3 py-2 pr-8 rounded-lg text-xs outline-none focus:border-[#003da6]"
              >
                {LANDMARK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
            Supabase error: {loadError}
          </div>
        )}

        <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="database-grid">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#c3c6d7] text-gray-400 text-[11px] font-bold tracking-wider uppercase">
                  <th className="px-4 py-4.5 select-none text-center w-12">#</th>
                  <th className="px-4 py-4.5">Landmark Name</th>
                  <th className="px-4 py-4.5 text-center">Latitude</th>
                  <th className="px-4 py-4.5 text-center">Longitude</th>
                  <th className="px-4 py-4.5 text-center">Geohash</th>
                  <th className="px-4 py-4.5 text-center">Created At</th>
                  <th className="px-4 py-4.5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100" id="landmarks-rows">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 px-6">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading landmarks from Supabase...
                      </div>
                    </td>
                  </tr>
                ) : paginatedLandmarks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 px-6">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-dashed border-gray-200">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">No Landmarks Found</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          No records match those filters. Adjust filters or register a new landmark.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLandmarks.map((landmark, idx) => {
                    const rowNum = (activePage - 1) * itemsPerPage + idx + 1;
                    const paddedNum = String(rowNum).padStart(3, '0');

                    return (
                      <tr
                        key={landmark.id}
                        className="hover:bg-blue-50/15 transition-all text-xs"
                      >
                        <td className="px-4 py-4 text-center font-mono font-bold text-gray-400 select-none">
                          {paddedNum}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <button
                              onClick={() => setDetailsLandmark(landmark)}
                              className="text-left font-bold text-gray-900 hover:text-[#003da6] transition-colors"
                              title="View full details"
                            >
                              {landmark.name}
                            </button>
                            <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                              {landmark.category}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[200px]" title={landmark.id}>
                              ID: {landmark.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-gray-600">
                          {landmark.latitude.toFixed(5)}°N
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-gray-600">
                          {landmark.longitude.toFixed(5)}°E
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-[#0052d9]/10 text-[#003da6] font-semibold rounded font-mono text-[11px] border border-blue-50">
                            {landmark.geohash}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-[11px] text-gray-500 font-mono whitespace-nowrap">
                          {formatTime(landmark.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right pr-4 shrink-0">
                          <div className="flex items-center justify-end gap-1">
                            {onToggleFavorite && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(landmark.id); }}
                                className={`p-1.5 rounded-full transition-all ${
                                  favoriteIds.has(landmark.id)
                                    ? 'text-red-500 hover:bg-red-50'
                                    : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                                }`}
                                title={favoriteIds.has(landmark.id) ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(landmark.id) ? 'fill-current' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={() => setDetailsLandmark(landmark)}
                              className="p-1.5 text-gray-500 hover:text-[#003da6] hover:bg-gray-100 rounded transition-all"
                              title="View full details"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleFocusOnMap(landmark)}
                              className="p-1 px-2.5 rounded bg-[#eef4fe] hover:bg-[#003da6] text-[#003da6] hover:text-white font-bold text-[10px] uppercase tracking-wide transition-all"
                              title="Show on map viewport"
                            >
                              Plot
                            </button>
                            <button
                              onClick={() => handleQueryNearby(landmark)}
                              className="p-1 px-2 text-gray-600 hover:text-[#003da6] hover:bg-gray-100 rounded text-[10px] font-bold uppercase transition-all"
                              title="Use as search center"
                            >
                              Scan Nearby
                            </button>
                            <button
                              onClick={() => onNavigateTo?.(landmark.id)}
                              className="p-1 px-2 rounded bg-green-50 hover:bg-green-500 text-green-700 hover:text-white font-bold text-[10px] uppercase tracking-wide transition-all flex items-center gap-1"
                              title="Navigate to this landmark"
                            >
                              <Navigation className="h-3 w-3" />
                              Nav
                            </button>
                            <button
                              onClick={() => onEditLandmark(landmark)}
                              className="p-1 px-2 rounded bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white font-bold text-[10px] uppercase tracking-wide transition-all flex items-center gap-1"
                              title="Edit this landmark"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteCandidate(landmark)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              title="Delete landmark"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredLandmarks.length > 0 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 bg-[#f8f9ff]/50 gap-3 text-xs">
              <span className="text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{startEntry}</span> to{' '}
                <span className="font-bold text-gray-900">{endEntry}</span> of{' '}
                <span className="font-bold text-gray-900">{totalEntries}</span> records
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 hover:border-[#c3c6d7] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7.5 h-7.5 rounded text-xs font-bold transition-all ${
                      activePage === pageNum
                        ? 'bg-[#003da6] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 hover:border-[#c3c6d7] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="deleteModal">
          <div
            className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteCandidate(null)}
          />

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-100">
                <AlertTriangle className="h-5.5 w-5.5 stroke-[2]" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-2">Delete Landmark?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteCandidate.name}"</span>?
                This will permanently remove the record (geohash <span className="font-mono bg-gray-50 text-red-500 px-1 rounded">{deleteCandidate.geohash}</span>) from Supabase.
              </p>
            </div>

            <div className="bg-[#f8f9ff]/80 border-t border-gray-100 px-6 py-4 flex gap-3 flex-row-reverse">
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-[98]"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-5 py-2 bg-white border border-[#c3c6d7] text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all active:scale-[98]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsLandmark && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" id="detailsModal">
          <div
            className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm"
            onClick={() => setDetailsLandmark(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#c3c6d7] animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-[#c3c6d7] bg-[#f8f9ff]/50 flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{detailsLandmark.name}</h3>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{detailsLandmark.category}</p>
              </div>
              <button
                onClick={() => setDetailsLandmark(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                title="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Latitude</span>
                  <span className="font-mono">{detailsLandmark.latitude.toFixed(6)}°N</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Longitude</span>
                  <span className="font-mono">{detailsLandmark.longitude.toFixed(6)}°E</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Geohash</span>
                  <span className="font-mono text-[#003da6]">{detailsLandmark.geohash}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Created At</span>
                  <span className="font-mono">{formatTime(detailsLandmark.created_at)}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">ID</span>
                <span className="font-mono break-all">{detailsLandmark.id}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#c3c6d7] bg-[#f8f9ff]/50 flex justify-end gap-2">
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(detailsLandmark.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    favoriteIds.has(detailsLandmark.id)
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(detailsLandmark.id) ? 'fill-current' : ''}`} />
                  {favoriteIds.has(detailsLandmark.id) ? 'Favorited' : 'Favorite'}
                </button>
              )}
              {onNavigateFrom && (
                <button
                  onClick={() => { onNavigateFrom(detailsLandmark.id); setDetailsLandmark(null); }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Navigation className="h-3.5 w-3.5" /> Start Here
                </button>
              )}
              {onNavigateTo && (
                <button
                  onClick={() => { onNavigateTo(detailsLandmark.id); setDetailsLandmark(null); }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Navigation className="h-3.5 w-3.5" /> Go Here
                </button>
              )}
              <button
                onClick={() => { onEditLandmark(detailsLandmark); setDetailsLandmark(null); }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => { handleFocusOnMap(detailsLandmark); }}
                className="px-4 py-2 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-xs font-bold transition-all"
              >
                Plot on Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
