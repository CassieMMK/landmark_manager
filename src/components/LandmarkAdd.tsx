import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { Map, Save, ArrowLeft, RefreshCw, AlertCircle, Compass, CheckCircle } from 'lucide-react';
import { encodeGeohash, LANDMARK_CATEGORIES } from '../utils';

interface LandmarkAddProps {
  onAddLandmark: (landmark: Omit<Landmark, 'id'>) => Promise<void>;
  setTab: (tab: 'home' | 'list' | 'add') => void;
  onShowSuccessToast: (message: string) => void;
}

export default function LandmarkAdd({
  onAddLandmark,
  setTab,
  onShowSuccessToast
}: LandmarkAddProps) {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Global Landmark');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [computedGeohash, setComputedGeohash] = useState<string>('');

  // Field validation states
  const [latError, setLatError] = useState<boolean>(false);
  const [lngError, setLngError] = useState<boolean>(false);

  // Dynamic Geohash calculation preview!
  useEffect(() => {
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      const hash = encodeGeohash(latNum, lngNum, 7);
      setComputedGeohash(hash);
    } else {
      setComputedGeohash('');
    }
  }, [latitude, longitude]);

  // Coordinate Inputs checks
  const handleLatChange = (val: string) => {
    setLatitude(val);
    const num = parseFloat(val);
    if (val !== '' && (isNaN(num) || num < -90 || num > 90)) {
      setLatError(true);
    } else {
      setLatError(false);
    }
  };

  const handleLngChange = (val: string) => {
    setLongitude(val);
    const num = parseFloat(val);
    if (val !== '' && (isNaN(num) || num < -180 || num > 180)) {
      setLngError(true);
    } else {
      setLngError(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return;
    }

    setIsSaving(true);

    const finalHash = encodeGeohash(latNum, lngNum, 7);
    
    const newLandmark: Omit<Landmark, 'id'> = {
      name: name.trim(),
      category: category,
      latitude: latNum,
      longitude: lngNum,
      geohash: finalHash,
    };

    await onAddLandmark(newLandmark);
    
    setIsSaving(false);
    // Clear fields & return to database screen
    setName('');
    setLatitude('');
    setLongitude('');
    setTab('list');
  };

  return (
    <main className="flex-grow flex items-center justify-center px-4 py-12 bg-[#f8f9ff]" id="landmark-add-panel">
      <div className="w-full max-w-[640px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md border border-[#c3c6d7] overflow-hidden">
          <div className="px-8 py-6 border-b border-[#c3c6d7] bg-[#f8f9ff]/50">
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">New Geodata Point</h1>
            <p className="text-xs text-gray-500 mt-1">
              Populate the fields below to register a new landmark in the Supabase database.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="p-8 space-y-6" id="add-landmark-form">
            {/* Name input */}
            <div className="space-y-1.5">
              <label 
                className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider" 
                htmlFor="land-name"
              >
                Landmark Name
              </label>
              <input
                id="land-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Central Data Hub"
                className="w-full px-4 py-2.5 rounded-lg border border-[#c3c6d7] bg-white text-gray-900 text-xs focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 outline-none transition-all"
                required
                disabled={isSaving}
              />
            </div>

            {/* Category dropdown & Geohash display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Category Tag
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#c3c6d7] bg-white text-gray-700 text-xs outline-none focus:border-[#003da6]"
                  disabled={isSaving}
                >
                  {LANDMARK_CATEGORIES.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Real-time Geohash preview
                </label>
                <div className="h-10 px-4 flex items-center bg-[#dde3ed]/35 border border-dashed border-[#c3c6d7] rounded-lg text-xs font-mono font-bold text-[#003da6]">
                  {computedGeohash ? (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <CheckCircle className="h-4 w-4 text-[#006c47]" /> {computedGeohash}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Enter coordinate to construct geohash</span>
                  )}
                </div>
              </div>
            </div>

            {/* Coordinates Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latitude */}
              <div className="space-y-1.5">
                <label 
                  className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider" 
                  htmlFor="lat-input"
                >
                  Latitude
                </label>
                <div className="relative">
                  <input
                    id="lat-input"
                    name="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => handleLatChange(e.target.value)}
                    placeholder="0.0000"
                    className={`w-full pl-4 pr-10 py-2.5 rounded-lg border bg-white text-gray-900 text-xs outline-none transition-all ${
                      latError ? 'border-red-500 text-red-700' : 'border-[#c3c6d7] focus:border-[#003da6]'
                    }`}
                    required
                    disabled={isSaving}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold select-none">
                    °N
                  </div>
                </div>
                {latError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Latitude must be between -90 and 90.
                  </p>
                )}
              </div>

              {/* Longitude */}
              <div className="space-y-1.5">
                <label 
                  className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider" 
                  htmlFor="lng-input"
                >
                  Longitude
                </label>
                <div className="relative">
                  <input
                    id="lng-input"
                    name="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => handleLngChange(e.target.value)}
                    placeholder="0.0000"
                    className={`w-full pl-4 pr-10 py-2.5 rounded-lg border bg-white text-gray-900 text-xs outline-none transition-all ${
                      lngError ? 'border-red-500 text-red-700' : 'border-[#c3c6d7] focus:border-[#003da6]'
                    }`}
                    required
                    disabled={isSaving}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold select-none">
                    °E
                  </div>
                </div>
                {lngError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Longitude must be between -180 and 180.
                  </p>
                )}
              </div>
            </div>

            {/* Visual Geospatial Preview Context */}
            <div className="relative h-44 rounded-xl overflow-hidden border border-[#c3c6d7] bg-[#eef4fe] group select-none">
              <div
                className="w-full h-full opacity-40 pointer-events-none"
                style={{
                  backgroundImage: [
                    'radial-gradient(ellipse at center, rgba(0,61,166,0.1) 1px, transparent 1px)',
                    'linear-gradient(to right, rgba(0,61,166,0.08) 1px, transparent 1px)',
                    'linear-gradient(to bottom, rgba(0,61,166,0.08) 1px, transparent 1px)',
                  ].join(', '),
                  backgroundSize: '18px 18px, 60px 60px, 60px 60px',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 text-[#003da6] font-bold">
                  <Map className="h-7 w-7 text-[#003da6]" />
                  <span className="text-[11px] uppercase tracking-widest font-extrabold text-[#003da6]">Geospatial Preview Context</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4">
              <button
                type="submit"
                disabled={isSaving || latError || lngError || !name}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow active:scale-97 transition-all shrink-0"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Indexing geodata...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Landmark
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setTab('list')}
                className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-[#c3c6d7] text-[#003da6] rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-gray-50 hover:border-gray-500 transition-all active:scale-97"
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
