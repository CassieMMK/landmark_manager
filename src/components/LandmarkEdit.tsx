import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { Save, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import { encodeGeohash, LANDMARK_CATEGORIES } from '../utils';

interface LandmarkEditProps {
  landmark: Landmark;
  onUpdateLandmark: (id: string, updates: Omit<Landmark, 'id' | 'created_at'>) => Promise<void>;
  onClose: () => void;
}

export default function LandmarkEdit({
  landmark,
  onUpdateLandmark,
  onClose,
}: LandmarkEditProps) {
  const [name, setName] = useState<string>(landmark.name);
  const [category, setCategory] = useState<string>(landmark.category);
  const [latitude, setLatitude] = useState<string>(String(landmark.latitude));
  const [longitude, setLongitude] = useState<string>(String(landmark.longitude));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [computedGeohash, setComputedGeohash] = useState<string>(landmark.geohash);

  const [latError, setLatError] = useState<boolean>(false);
  const [lngError, setLngError] = useState<boolean>(false);

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

    const updates: Omit<Landmark, 'id' | 'created_at'> = {
      name: name.trim(),
      category,
      latitude: latNum,
      longitude: lngNum,
      geohash: finalHash,
    };

    await onUpdateLandmark(landmark.id, updates);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" id="editModal">
      <div
        className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[640px] overflow-hidden border border-[#c3c6d7] animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-[#c3c6d7] bg-[#f8f9ff]/50 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">Edit Landmark</h1>
            <p className="text-xs text-gray-500 mt-1">
              Update fields below; geohash is recomputed automatically when coordinates change.
            </p>
          </div>
          <button
            onClick={() => !isSaving && onClose()}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Close"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-8 space-y-6" id="edit-landmark-form">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Landmark Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#c3c6d7] bg-white text-gray-900 text-xs focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 outline-none transition-all"
              required
              disabled={isSaving}
            />
          </div>

          {/* Category + Geohash */}
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
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-[#006c47]" /> {computedGeohash}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Enter coordinate to construct geohash</span>
                )}
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Latitude
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => handleLatChange(e.target.value)}
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

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Longitude
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => handleLngChange(e.target.value)}
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

          {/* Read-only meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#f8f9ff] border border-[#c3c6d7] rounded-lg text-[11px] text-gray-600">
            <div>
              <span className="block font-bold uppercase tracking-wider text-gray-400 mb-0.5">ID</span>
              <span className="font-mono break-all">{landmark.id}</span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-gray-400 mb-0.5">Created At</span>
              <span className="font-mono">{landmark.created_at ? new Date(landmark.created_at).toLocaleString() : '—'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
            <button
              type="submit"
              disabled={isSaving || latError || lngError || !name.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow active:scale-97 transition-all shrink-0"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-[#c3c6d7] text-[#003da6] rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-gray-50 hover:border-gray-500 transition-all active:scale-97"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
