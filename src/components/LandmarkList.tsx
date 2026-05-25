import React, { useState, useMemo } from 'react';
import { Landmark } from '../types';
import { Search, Filter, Trash2, ArrowRight, ChevronLeft, ChevronRight, MapPin, AlertTriangle, Plus, Compass } from 'lucide-react';
import { LANDMARK_CATEGORIES } from '../utils';

interface LandmarkListProps {
  landmarks: Landmark[];
  onDeleteLandmark: (id: string) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  setTab: (tab: 'home' | 'list' | 'add') => void;
  onSetNearbyInputs: (lat: number, lng: number) => void;
}

export default function LandmarkList({
  landmarks,
  onDeleteLandmark,
  onSelectLandmark,
  setTab,
  onSetNearbyInputs
}: LandmarkListProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(7);

  // States for deleting verification modal
  const [deleteCandidate, setDeleteCandidate] = useState<Landmark | null>(null);

  // Filter & Search Logic
  const filteredLandmarks = useMemo(() => {
    return landmarks.filter((landmark) => {
      const matchesSearch = landmark.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        landmark.geohash.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All Categories' || landmark.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [landmarks, searchTerm, selectedCategory]);

  // Pagination bounds
  const totalEntries = filteredLandmarks.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  
  // Shift page if current is empty
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

  return (
    <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto" id="landmark-list-workspace">
      
      {/* List sidebar / GIS Tools Context drawer */}
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
            onClick={() => { setTab('home'); }}
            className="flex items-center gap-3 text-left w-full text-xs font-semibold text-gray-600 hover:text-[#003da6] hover:bg-gray-50 p-2.5 rounded-lg transition-colors border border-transparent hover:border-gray-100"
          >
            <Search className="h-4 w-4 text-gray-400" />
            Search Nearby Area
          </button>
          
          <button 
            onClick={() => { setTab('home'); }}
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

      {/* Main content table card */}
      <main className="flex-grow p-6 sm:p-8 bg-[#f8f9ff]">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">Stored Landmarks</h1>
            <p className="text-sm text-gray-500">
              Manage and audit your geospatial database of <span className="font-bold text-gray-800">{landmarks.length}</span> cache entries, loaded in memory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3" id="filters-row">
            {/* Search Input */}
            <div className="relative shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search className="h-4 w-4" /></span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 bg-white border border-[#c3c6d7] rounded-lg w-full sm:w-56 focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 outline-none transition-all text-xs"
                placeholder="Search by name or geohash..."
              />
            </div>

            {/* Category Filter */}
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

        {/* Stored Landmarks Table Card */}
        <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="database-grid">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#c3c6d7] text-gray-400 text-[11px] font-bold tracking-wider uppercase">
                  <th className="px-6 py-4.5 select-none text-center w-12">#</th>
                  <th className="px-6 py-4.5">Landmark Name</th>
                  <th className="px-6 py-4.5 text-center">Latitude</th>
                  <th className="px-6 py-4.5 text-center">Longitude</th>
                  <th className="px-6 py-4.5 text-center">Geohash</th>
                  <th className="px-6 py-4.5 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100" id="landmarks-rows">
                {paginatedLandmarks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 px-6">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-dashed border-gray-200">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">No Cache Indices Found</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          No indexed landmarks found matching those parameters. Adjust filters or register a new landmark.
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
                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-400 select-none">
                          {paddedNum}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 hover:text-[#003da6] transition-colors">
                              {landmark.name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                              {landmark.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-gray-600">
                          {landmark.latitude.toFixed(5)}°N
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-gray-600">
                          {landmark.longitude.toFixed(5)}°E
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-[#0052d9]/10 text-[#003da6] font-semibold rounded font-mono text-[11px] border border-blue-50">
                            {landmark.geohash}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right pr-6 shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
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
                              title="Set coordinates for queries"
                            >
                              Scan Nearby
                            </button>
                            <button
                              onClick={() => setDeleteCandidate(landmark)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              title="Remove index from Redis cache"
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

          {/* Simple Pagination Footer bar */}
          {filteredLandmarks.length > 0 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 bg-[#f8f9ff]/50 gap-3 text-xs">
              <span className="text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{startEntry}</span> to{' '}
                <span className="font-bold text-gray-900">{endEntry}</span> of{' '}
                <span className="font-bold text-gray-900">{totalEntries}</span> cached indexes
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      {/* Delete Confirmation Modal Overlay */}
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
                Are you absolutely sure you want to delete <span className="font-bold text-gray-900">"{deleteCandidate.name}"</span>? 
                This action is irreversible and will purge the hash cache <span className="font-mono bg-gray-50 text-red-500 px-1 px-1.5 rounded">{deleteCandidate.geohash}</span> immediately.
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
    </div>
  );
}
