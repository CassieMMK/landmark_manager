import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import GisSidebar from './components/GisSidebar';
import InteractiveMap from './components/InteractiveMap';
import LandmarkList from './components/LandmarkList';
import LandmarkAdd from './components/LandmarkAdd';
import LandmarkEdit from './components/LandmarkEdit';
import { Landmark, AppTab } from './types';
import { calculateHaversineDistance } from './utils';
import { CheckCircle, X, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';

export type DbStatus = 'connecting' | 'connected' | 'error';

export default function App() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DbStatus>('connecting');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentTab, setTab] = useState<AppTab>('home');
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Editing
  const [editingLandmark, setEditingLandmark] = useState<Landmark | null>(null);

  // Viewport projection coordinates
  const [centerLat, setCenterLat] = useState<number>(40.7128); // NYC
  const [centerLng, setCenterLng] = useState<number>(-74.0060);

  // Nearby search states
  const [searchLat, setSearchLat] = useState<string>('40.7128');
  const [searchLng, setSearchLng] = useState<string>('-74.0060');
  const [searchRadius, setSearchRadius] = useState<string>('10'); // sensible default 10 km
  const [nearbyResults, setNearbyResults] = useState<{ landmark: Landmark; distanceKm: number }[] | null>(null);

  // Distance tool states
  const [selectedFromLandmarkId, setSelectedFromLandmarkId] = useState<string>('');
  const [selectedToLandmarkId, setSelectedToLandmarkId] = useState<string>('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLandmarks = async () => {
    setIsLoading(true);
    setDbStatus('connecting');
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('landmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching landmarks:', error);
        setLoadError(error.message || 'Failed to fetch landmarks from Supabase.');
        setDbStatus('error');
        setLandmarks([]);
        showToast('Failed to fetch landmarks from Supabase.');
      } else {
        setLandmarks(data || []);
        setDbStatus('connected');
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
      setLoadError(e?.message || 'Network error while contacting Supabase.');
      setDbStatus('error');
      setLandmarks([]);
      showToast('Network error while contacting Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const handleAddLandmark = async (item: Omit<Landmark, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('landmarks')
        .insert([item])
        .select();

      if (error) {
        console.error('Error adding landmark:', error);
        showToast(`Failed to save landmark: ${error.message}`);
        return;
      }

      if (data && data[0]) {
        const newItem = data[0] as Landmark;
        setLandmarks((prev) => [newItem, ...prev]);
        setCenterLat(newItem.latitude);
        setCenterLng(newItem.longitude);
        setSelectedLandmark(newItem);
        showToast(`Landmark "${newItem.name}" saved to Supabase.`);
      }
    } catch (e: any) {
      console.error('Insert error:', e);
      showToast(`An error occurred while saving: ${e?.message || e}`);
    }
  };

  const handleUpdateLandmark = async (
    id: string,
    updates: Omit<Landmark, 'id' | 'created_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('landmarks')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating landmark:', error);
        showToast(`Failed to update landmark: ${error.message}`);
        return;
      }

      const updated = (data && data[0]) as Landmark | undefined;
      if (updated) {
        setLandmarks((prev) => prev.map((l) => (l.id === id ? updated : l)));
        if (selectedLandmark?.id === id) {
          setSelectedLandmark(updated);
        }
        showToast(`Landmark "${updated.name}" updated.`);
      } else {
        // Fallback: merge locally
        setLandmarks((prev) =>
          prev.map((l) => (l.id === id ? ({ ...l, ...updates } as Landmark) : l))
        );
        showToast('Landmark updated.');
      }
    } catch (e: any) {
      console.error('Update error:', e);
      showToast(`An error occurred while updating: ${e?.message || e}`);
    }
  };

  const handleDeleteLandmark = async (id: string) => {
    try {
      const { error } = await supabase.from('landmarks').delete().eq('id', id);

      if (error) {
        console.error('Error deleting landmark:', error);
        showToast(`Failed to delete landmark: ${error.message}`);
        return;
      }

      setLandmarks((prev) => prev.filter((item) => item.id !== id));
      if (selectedLandmark?.id === id) setSelectedLandmark(null);
      if (selectedFromLandmarkId === id) {
        setSelectedFromLandmarkId('');
        setCalculatedDistance(null);
      }
      if (selectedToLandmarkId === id) {
        setSelectedToLandmarkId('');
        setCalculatedDistance(null);
      }
      showToast(`Removed landmark [ID: ${id}]`);
    } catch (e: any) {
      console.error('Delete error:', e);
      showToast(`An error occurred while deleting: ${e?.message || e}`);
    }
  };

  // Search nearby
  const handleSearchNearby = () => {
    const latNum = parseFloat(searchLat);
    const lngNum = parseFloat(searchLng);
    const radKm = parseFloat(searchRadius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radKm) || radKm <= 0) {
      showToast('Please provide a valid latitude, longitude, and radius (km).');
      return;
    }

    setCenterLat(latNum);
    setCenterLng(lngNum);

    const results = landmarks
      .map((landmark) => {
        const dist = calculateHaversineDistance(latNum, lngNum, landmark.latitude, landmark.longitude);
        return { landmark, distanceKm: dist };
      })
      .filter((item) => item.distanceKm <= radKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setNearbyResults(results);
    showToast(`Nearby scan complete: ${results.length} landmark(s) within ${radKm} km.`);
  };

  const handleClearNearby = () => {
    setNearbyResults(null);
  };

  // Distance
  const handleCalculateDistance = () => {
    setDistanceError(null);
    if (!selectedFromLandmarkId || !selectedToLandmarkId) return;

    if (selectedFromLandmarkId === selectedToLandmarkId) {
      setDistanceError('Start and destination cannot be the same landmark.');
      setCalculatedDistance(null);
      return;
    }

    const fromL = landmarks.find((l) => l.id === selectedFromLandmarkId);
    const toL = landmarks.find((l) => l.id === selectedToLandmarkId);
    if (!fromL || !toL) return;

    const dist = calculateHaversineDistance(fromL.latitude, fromL.longitude, toL.latitude, toL.longitude);
    setCalculatedDistance(dist);
    setCenterLat((fromL.latitude + toL.latitude) / 2);
    setCenterLng((fromL.longitude + toL.longitude) / 2);
    showToast(`Distance: ${dist.toFixed(2)} km`);
  };

  // Map click → set search center
  const handleMapClickSetCenter = (lat: number, lng: number) => {
    setSearchLat(lat.toFixed(5));
    setSearchLng(lng.toFixed(5));
    setCenterLat(lat);
    setCenterLng(lng);
    showToast(`Search center set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handleSelectLandmarkFromMap = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setCenterLat(landmark.latitude);
    setCenterLng(landmark.longitude);
  };

  // Set query inputs from a list row + immediate scan using current radius
  const handleSetQueryInputs = (lat: number, lng: number) => {
    setSearchLat(lat.toFixed(5));
    setSearchLng(lng.toFixed(5));
    setCenterLat(lat);
    setCenterLng(lng);

    const radKm = parseFloat(searchRadius);
    const effectiveRad = isNaN(radKm) || radKm <= 0 ? 10 : radKm;

    setTimeout(() => {
      const results = landmarks
        .map((landmark) => {
          const dist = calculateHaversineDistance(lat, lng, landmark.latitude, landmark.longitude);
          return { landmark, distanceKm: dist };
        })
        .filter((item) => item.distanceKm <= effectiveRad)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setNearbyResults(results);
    }, 50);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const distanceFromLandmark = landmarks.find((l) => l.id === selectedFromLandmarkId) || null;
  const distanceToLandmark = landmarks.find((l) => l.id === selectedToLandmarkId) || null;

  const nearbyHighlightIds = new Set<string>((nearbyResults || []).map((r) => r.landmark.id));

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9ff] text-gray-900 font-sans">

      <Header currentTab={currentTab} setTab={setTab} dbStatus={dbStatus} />

      {/* Loading / error banners */}
      {isLoading && (
        <div className="max-w-7xl w-full mx-auto px-6 py-2.5 bg-blue-50 border-b border-blue-100 text-xs text-[#003da6] font-semibold flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Loading landmarks from Supabase...
        </div>
      )}
      {!isLoading && loadError && (
        <div className="max-w-7xl w-full mx-auto px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700 font-semibold flex items-center justify-between gap-2">
          <span>Supabase error: {loadError}</span>
          <button
            onClick={fetchLandmarks}
            className="px-2.5 py-1 bg-white border border-red-200 rounded text-[11px] font-bold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {currentTab === 'home' && (
        <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto overflow-hidden min-h-[500px]" id="map-workspace">
          <GisSidebar
            landmarks={landmarks}
            searchLat={searchLat}
            setSearchLat={setSearchLat}
            searchLng={searchLng}
            setSearchLng={setSearchLng}
            searchRadius={searchRadius}
            setSearchRadius={setSearchRadius}
            onSearchNearby={handleSearchNearby}
            onClearNearby={handleClearNearby}
            nearbyResults={nearbyResults}
            selectedFromLandmarkId={selectedFromLandmarkId}
            setSelectedFromLandmarkId={setSelectedFromLandmarkId}
            selectedToLandmarkId={selectedToLandmarkId}
            setSelectedToLandmarkId={setSelectedToLandmarkId}
            calculatedDistance={calculatedDistance}
            distanceError={distanceError}
            onCalculateDistance={handleCalculateDistance}
            onResultClick={handleSelectLandmarkFromMap}
            onAddClick={() => setTab('add')}
          />

          <InteractiveMap
            landmarks={landmarks}
            centerLat={centerLat}
            centerLng={centerLng}
            onCenterChange={(lat, lng) => {
              setCenterLat(lat);
              setCenterLng(lng);
            }}
            onMapDoubleClickSetCenter={handleMapClickSetCenter}
            selectedLandmark={selectedLandmark}
            onSelectLandmark={handleSelectLandmarkFromMap}
            distanceFrom={distanceFromLandmark}
            distanceTo={distanceToLandmark}
            distanceVal={calculatedDistance}
            highlightedIds={nearbyHighlightIds}
          />
        </div>
      )}

      {currentTab === 'list' && (
        <LandmarkList
          landmarks={landmarks}
          isLoading={isLoading}
          loadError={loadError}
          onDeleteLandmark={handleDeleteLandmark}
          onSelectLandmark={handleSelectLandmarkFromMap}
          onEditLandmark={(landmark) => setEditingLandmark(landmark)}
          setTab={setTab}
          onSetNearbyInputs={handleSetQueryInputs}
        />
      )}

      {currentTab === 'add' && (
        <LandmarkAdd
          onAddLandmark={handleAddLandmark}
          setTab={setTab}
          onShowSuccessToast={showToast}
        />
      )}

      <Footer showLatency={currentTab === 'home'} />

      {editingLandmark && (
        <LandmarkEdit
          landmark={editingLandmark}
          onUpdateLandmark={handleUpdateLandmark}
          onClose={() => setEditingLandmark(null)}
        />
      )}

      {toastMessage && (
        <div
          className="fixed bottom-8 right-8 z-[200] max-w-sm pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300"
          id="success-toast-overlay"
        >
          <div className="bg-[#78fbbb] text-[#002112] px-5 py-4 rounded-xl shadow-2xl border border-[#006c47]/20 flex items-start gap-4 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-[#006c47] flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle className="h-5.5 w-5.5 text-white" />
            </div>
            <div className="flex-grow pt-0.5">
              <p className="font-extrabold text-sm text-gray-900">Notification</p>
              <p className="text-xs text-gray-700 font-semibold mt-1 leading-relaxed">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors shrink-0 text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
