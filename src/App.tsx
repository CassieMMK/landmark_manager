import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import GisSidebar from './components/GisSidebar';
import InteractiveMap from './components/InteractiveMap';
import LandmarkList from './components/LandmarkList';
import LandmarkAdd from './components/LandmarkAdd';
import { Landmark, AppTab } from './types';
import { DEFAULT_LANDMARKS, calculateHaversineDistance } from './utils';
import { CheckCircle, X, MapPin, Database } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentTab, setTab] = useState<AppTab>('home');
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Viewport projection coordinates
  const [centerLat, setCenterLat] = useState<number>(40.7128); // NYC coordinates
  const [centerLng, setCenterLng] = useState<number>(-74.0060);

  // Nearby search states
  const [searchLat, setSearchLat] = useState<string>('40.7128');
  const [searchLng, setSearchLng] = useState<string>('-74.0060');
  const [searchRadius, setSearchRadius] = useState<string>('5000'); // 5000 km defaults so international triggers hit
  const [nearbyResults, setNearbyResults] = useState<{ landmark: Landmark; distanceKm: number }[] | null>(null);

  // Distance tool states
  const [selectedFromLandmarkId, setSelectedFromLandmarkId] = useState<string>('');
  const [selectedToLandmarkId, setSelectedToLandmarkId] = useState<string>('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

  // General Toast banner alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial data fetch from Supabase
  useEffect(() => {
    const fetchLandmarks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('landmarks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching landmarks:', error);
          showToast('Failed to fetch landmarks from database.');
          setLandmarks(DEFAULT_LANDMARKS); // Fallback
        } else if (data) {
          setLandmarks(data);
        }
      } catch (e) {
        console.error('Fetch error:', e);
        setLandmarks(DEFAULT_LANDMARKS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLandmarks();
  }, []);

  // Handle addition of a landmark key
  const handleAddLandmark = async (item: Omit<Landmark, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('landmarks')
        .insert([item])
        .select();

      if (error) {
        console.error('Error adding landmark:', error);
        showToast('Failed to save landmark to database.');
        return;
      }

      if (data && data[0]) {
        const newItem = data[0] as Landmark;
        setLandmarks((prev) => [newItem, ...prev]);
        // Set map center to newly added item and highlight it
        setCenterLat(newItem.latitude);
        setCenterLng(newItem.longitude);
        setSelectedLandmark(newItem);
        showToast(`Landmark "${newItem.name}" has been indexed in Supabase.`);
      }
    } catch (e) {
      console.error('Insert error:', e);
      showToast('An error occurred while saving.');
    }
  };

  // Handle deletion of a landmark key
  const handleDeleteLandmark = async (id: string) => {
    try {
      const { error } = await supabase
        .from('landmarks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting landmark:', error);
        showToast('Failed to delete landmark from database.');
        return;
      }

      setLandmarks((prev) => prev.filter((item) => item.id !== id));
      if (selectedLandmark?.id === id) {
        setSelectedLandmark(null);
      }
      if (selectedFromLandmarkId === id) {
        setSelectedFromLandmarkId('');
        setCalculatedDistance(null);
      }
      if (selectedToLandmarkId === id) {
        setSelectedToLandmarkId('');
        setCalculatedDistance(null);
      }
      showToast(`Removed landmark [ID: ${id}]`);
    } catch (e) {
      console.error('Delete error:', e);
      showToast('An error occurred while deleting.');
    }
  };

  // Search nearby algorithms
  const handleSearchNearby = () => {
    const latNum = parseFloat(searchLat);
    const lngNum = parseFloat(searchLng);
    const radKm = parseFloat(searchRadius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radKm)) {
      return;
    }

    // Set map center to current search anchor
    setCenterLat(latNum);
    setCenterLng(lngNum);

    // Compute range distance for all nodes
    const results = landmarks
      .map((landmark) => {
        const dist = calculateHaversineDistance(
          latNum,
          lngNum,
          landmark.latitude,
          landmark.longitude
        );
        return { landmark, distanceKm: dist };
      })
      .filter((item) => item.distanceKm <= radKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setNearbyResults(results);
    showToast(`Dispatched GEORADIUS scan: Found ${results.length} cache hits.`);
  };

  // Distance calculations
  const handleCalculateDistance = () => {
    const fromL = landmarks.find((l) => l.id === selectedFromLandmarkId);
    const toL = landmarks.find((l) => l.id === selectedToLandmarkId);

    if (!fromL || !toL) return;

    const dist = calculateHaversineDistance(
      fromL.latitude,
      fromL.longitude,
      toL.latitude,
      toL.longitude
    );
    setCalculatedDistance(dist);
    // Align map to cover both coordinates (use midpoints)
    setCenterLat((fromL.latitude + toL.latitude) / 2);
    setCenterLng((fromL.longitude + toL.longitude) / 2);
    showToast(`GEODIST calculated: ${dist.toFixed(2)} km`);
  };

  // Highlight selection trigger
  const handleSelectLandmarkFromMap = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setCenterLat(landmark.latitude);
    setCenterLng(landmark.longitude);
  };

  // Help populate query coordinate fields from grid rows
  const handleSetQueryInputs = (lat: number, lng: number) => {
    setSearchLat(lat.toFixed(5));
    setSearchLng(lng.toFixed(5));
    // Trigger immediate scan
    setTimeout(() => {
      const results = landmarks
        .map((landmark) => {
          const dist = calculateHaversineDistance(
            lat,
            lng,
            landmark.latitude,
            landmark.longitude
          );
          return { landmark, distanceKm: dist };
        })
        .filter((item) => item.distanceKm <= 5000) // Default scan limit
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setNearbyResults(results);
    }, 50);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  // Dismiss Toast helper
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const distanceFromLandmark = landmarks.find((l) => l.id === selectedFromLandmarkId) || null;
  const distanceToLandmark = landmarks.find((l) => l.id === selectedToLandmarkId) || null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9ff] text-gray-900 font-sans">
      
      {/* Top Header Navigation */}
      <Header currentTab={currentTab} setTab={setTab} />

      {/* Primary Application Workspace Frame */}
      {currentTab === 'home' && (
        <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto overflow-hidden min-h-[500px]" id="map-workspace">
          {/* GIS Sidebar Menu panel */}
          <GisSidebar
            landmarks={landmarks}
            searchLat={searchLat}
            setSearchLat={setSearchLat}
            searchLng={searchLng}
            setSearchLng={setSearchLng}
            searchRadius={searchRadius}
            setSearchRadius={setSearchRadius}
            onSearchNearby={handleSearchNearby}
            nearbyResults={nearbyResults}
            selectedFromLandmarkId={selectedFromLandmarkId}
            setSelectedFromLandmarkId={setSelectedFromLandmarkId}
            selectedToLandmarkId={selectedToLandmarkId}
            setSelectedToLandmarkId={setSelectedToLandmarkId}
            calculatedDistance={calculatedDistance}
            onCalculateDistance={handleCalculateDistance}
            onResultClick={handleSelectLandmarkFromMap}
            onAddClick={() => setTab('add')}
          />

          {/* Interactive map visualization canvas */}
          <InteractiveMap
            landmarks={landmarks}
            centerLat={centerLat}
            centerLng={centerLng}
            onCenterChange={(lat, lng) => {
              setCenterLat(lat);
              setCenterLng(lng);
            }}
            selectedLandmark={selectedLandmark}
            onSelectLandmark={handleSelectLandmarkFromMap}
            distanceFrom={distanceFromLandmark}
            distanceTo={distanceToLandmark}
            distanceVal={calculatedDistance}
          />
        </div>
      )}

      {currentTab === 'list' && (
        <LandmarkList
          landmarks={landmarks}
          onDeleteLandmark={handleDeleteLandmark}
          onSelectLandmark={handleSelectLandmarkFromMap}
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

      {/* Global Bottom Footer metadata */}
      <Footer showLatency={currentTab === 'home'} />

      {/* Success Notification Toast Overlay (Screen 1 & 2 spec) */}
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
              <p className="font-extrabold text-sm text-gray-900">Entry Successful</p>
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
