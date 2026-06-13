import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import GisSidebar from './components/GisSidebar';
import InteractiveMap from './components/InteractiveMap';
import LandmarkList from './components/LandmarkList';
import LandmarkAdd from './components/LandmarkAdd';
import LandmarkEdit from './components/LandmarkEdit';
import RoutePlanner from './components/RoutePlanner';
import TripPlanner from './components/TripPlanner';
import AuthModal from './components/AuthModal';
import FavoritesPage from './components/FavoritesPage';
import SavedRoutesPage from './components/SavedRoutesPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Landmark, AppTab, SavedRoute, SavedTrip } from './types';
import { calculateHaversineDistance } from './utils';
import { CheckCircle, X, RefreshCw, PanelBottomOpen, PanelBottomClose } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { RouteResult } from './services/amap';

export type DbStatus = 'connecting' | 'connected' | 'error';
export type RedisStatus = 'connecting' | 'connected' | 'error';

function AppInner() {
  const { user, requireAuth } = useAuth();

  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DbStatus>('connecting');
  const [redisStatus, setRedisStatus] = useState<RedisStatus>('connecting');
  const [redisGeoCount, setRedisGeoCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Wrap setTab to clear map overlays when leaving route/trip
  const setTab = useCallback((tab: AppTab) => {
    // Clear route/trip polylines when navigating away
    if (tab !== 'route') {
      setRouteResult(null);
      setRoutePathIdx(0);
    }
    if (tab !== 'trip') {
      setTripSegments([]);
    }
    // Clear distance line when leaving home tab
    if (tab !== 'home') {
      setCalculatedDistance(null);
      setSelectedFromLandmarkId('');
      setSelectedToLandmarkId('');
      setDistanceError(null);
    }
    setMobileSidebarOpen(true);
    setCurrentTab(tab);
  }, []);

  // Editing
  const [editingLandmark, setEditingLandmark] = useState<Landmark | null>(null);

  // Viewport projection coordinates
  const [centerLat, setCenterLat] = useState<number>(40.7128);
  const [centerLng, setCenterLng] = useState<number>(-74.0060);

  // Nearby search states
  const [searchLat, setSearchLat] = useState<string>('');
  const [searchLng, setSearchLng] = useState<string>('');
  const [searchRadius, setSearchRadius] = useState<string>('');
  const [nearbyResults, setNearbyResults] = useState<{ landmark: Landmark; distanceKm: number }[] | null>(null);

  // Distance tool states
  const [selectedFromLandmarkId, setSelectedFromLandmarkId] = useState<string>('');
  const [selectedToLandmarkId, setSelectedToLandmarkId] = useState<string>('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Route planning state
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routePathIdx, setRoutePathIdx] = useState(0);

  // Trip planning state (multi-segment)
  const [tripSegments, setTripSegments] = useState<RouteResult[]>([]);

  // Navigate-to helpers
  const [navigateToLandmarkId, setNavigateToLandmarkId] = useState<string | null>(null);
  const [navigateFromLandmarkId, setNavigateFromLandmarkId] = useState<string | null>(null);

  // GPS position
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Saved routes & trips
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  // Track last auto-saved route/trip (for favorite toggle in planner UI)
  const [lastSavedRouteId, setLastSavedRouteId] = useState<string | null>(null);
  const [lastSavedRouteFavorite, setLastSavedRouteFavorite] = useState(false);
  const [lastSavedTripId, setLastSavedTripId] = useState<string | null>(null);
  const [lastSavedTripFavorite, setLastSavedTripFavorite] = useState(false);

  // ──────────────────────────────
  //  Fetch landmarks
  // ──────────────────────────────
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

  // Redis health check
  useEffect(() => {
    const checkRedis = async () => {
      try {
        const res = await fetch('/api/geo-test');
        const data = await res.json();
        if (data.status === 'connected') {
          setRedisStatus('connected');
          setRedisGeoCount(data.geoKeyCount ?? null);
        } else {
          setRedisStatus('error');
        }
      } catch {
        setRedisStatus('error');
      }
    };
    checkRedis();
  }, []);

  // ──────────────────────────────
  //  Fetch favorites when user changes
  // ──────────────────────────────
  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavoriteIds(new Set()); return; }
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('landmark_id')
        .eq('user_id', user.id);
      if (!error && data) {
        setFavoriteIds(new Set(data.map((f: any) => f.landmark_id)));
      }
    } catch (e) {
      console.error('Failed to fetch favorites:', e);
    }
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  // ──────────────────────────────
  //  Fetch saved routes & trips
  // ──────────────────────────────
  const fetchSavedRoutes = useCallback(async () => {
    if (!user) { setSavedRoutes([]); setSavedTrips([]); return; }
    try {
      const [routeRes, tripRes] = await Promise.all([
        supabase.from('saved_routes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('saved_trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (routeRes.data) setSavedRoutes(routeRes.data as SavedRoute[]);
      if (tripRes.data) setSavedTrips(tripRes.data as SavedTrip[]);
    } catch (e) {
      console.error('Failed to fetch saved routes/trips:', e);
    }
  }, [user]);

  useEffect(() => { fetchSavedRoutes(); }, [fetchSavedRoutes]);

  // ──────────────────────────────
  //  Toggle favorite
  // ──────────────────────────────
  const handleToggleFavorite = (landmarkId: string) => {
    requireAuth(async () => {
      if (!user) return;
      const isFav = favoriteIds.has(landmarkId);
      if (isFav) {
        // Remove
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('landmark_id', landmarkId);
        if (!error) {
          setFavoriteIds((prev) => { const next = new Set(prev); next.delete(landmarkId); return next; });
          showToast('Removed from favorites.');
        } else {
          showToast('Failed to remove from favorites.');
        }
      } else {
        // Add
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, landmark_id: landmarkId }]);
        if (!error) {
          setFavoriteIds((prev) => new Set(prev).add(landmarkId));
          showToast('Added to favorites!');
        } else {
          showToast('Failed to add to favorites.');
        }
      }
    });
  };

  // ──────────────────────────────
  //  Auto-save route (called on every successful plan)
  // ──────────────────────────────
  const handleAutoSaveRoute = useCallback(async (data: {
    name: string; mode: string;
    originLat: number; originLng: number;
    destLat: number; destLng: number;
    originName: string; destName: string;
    strategy: number; routeData: RouteResult;
  }) => {
    if (!user) return;
    try {
      const { data: inserted, error } = await supabase.from('saved_routes').insert([{
        user_id: user.id,
        name: data.name,
        mode: data.mode,
        origin_lat: data.originLat,
        origin_lng: data.originLng,
        dest_lat: data.destLat,
        dest_lng: data.destLng,
        origin_name: data.originName,
        dest_name: data.destName,
        strategy: data.strategy,
        route_data: data.routeData,
      }]).select();
      if (error) {
        console.error('Auto-save route failed:', error);
        return;
      }
      if (inserted?.[0]) {
        setLastSavedRouteId(inserted[0].id);
        setLastSavedRouteFavorite(inserted[0].is_favorite ?? false);
        fetchSavedRoutes();
      }
    } catch (e) {
      console.error('Auto-save route exception:', e);
    }
  }, [user, fetchSavedRoutes]);

  // ──────────────────────────────
  //  Auto-save trip (called on every successful plan)
  // ──────────────────────────────
  const handleAutoSaveTrip = useCallback(async (data: {
    name: string; mode: string;
    waypointIds: string[]; waypointNames: string[];
    useGpsStart: boolean; gpsLat: number | null; gpsLng: number | null;
    segmentsData: RouteResult[];
  }) => {
    if (!user) return;
    try {
      const { data: inserted, error } = await supabase.from('saved_trips').insert([{
        user_id: user.id,
        name: data.name,
        mode: data.mode,
        waypoint_ids: data.waypointIds,
        waypoint_names: data.waypointNames,
        use_gps_start: data.useGpsStart,
        gps_lat: data.gpsLat,
        gps_lng: data.gpsLng,
        segments_data: data.segmentsData,
      }]).select();
      if (error) {
        console.error('Auto-save trip failed:', error);
        return;
      }
      if (inserted?.[0]) {
        setLastSavedTripId(inserted[0].id);
        setLastSavedTripFavorite(inserted[0].is_favorite ?? false);
        fetchSavedRoutes();
      }
    } catch (e) {
      console.error('Auto-save trip exception:', e);
    }
  }, [user, fetchSavedRoutes]);

  // ──────────────────────────────
  //  Toggle route/trip favorite
  // ──────────────────────────────
  const handleToggleRouteFavorite = async (id: string) => {
    // Check local state first, fall back to optimistic toggle
    const route = savedRoutes.find((r) => r.id === id);
    const currentVal = route ? route.is_favorite : (id === lastSavedRouteId ? lastSavedRouteFavorite : false);
    const newVal = !currentVal;
    const { error } = await supabase
      .from('saved_routes')
      .update({ is_favorite: newVal })
      .eq('id', id);
    if (!error) {
      setSavedRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: newVal } : r))
      );
      if (id === lastSavedRouteId) setLastSavedRouteFavorite(newVal);
      showToast(newVal ? 'Route added to favorites!' : 'Route removed from favorites.');
    } else {
      showToast('Failed to update favorite status.');
    }
  };

  const handleToggleTripFavorite = async (id: string) => {
    const trip = savedTrips.find((t) => t.id === id);
    const currentVal = trip ? trip.is_favorite : (id === lastSavedTripId ? lastSavedTripFavorite : false);
    const newVal = !currentVal;
    const { error } = await supabase
      .from('saved_trips')
      .update({ is_favorite: newVal })
      .eq('id', id);
    if (!error) {
      setSavedTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_favorite: newVal } : t))
      );
      if (id === lastSavedTripId) setLastSavedTripFavorite(newVal);
      showToast(newVal ? 'Trip added to favorites!' : 'Trip removed from favorites.');
    } else {
      showToast('Failed to update favorite status.');
    }
  };

  // ──────────────────────────────
  //  Delete saved route / trip
  // ──────────────────────────────
  const handleDeleteRoute = async (id: string) => {
    const { error } = await supabase.from('saved_routes').delete().eq('id', id);
    if (!error) {
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
      showToast('Route deleted.');
    } else {
      showToast('Failed to delete route.');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    const { error } = await supabase.from('saved_trips').delete().eq('id', id);
    if (!error) {
      setSavedTrips((prev) => prev.filter((t) => t.id !== id));
      showToast('Trip deleted.');
    } else {
      showToast('Failed to delete trip.');
    }
  };

  // ──────────────────────────────
  //  Use saved route / trip
  // ──────────────────────────────
  const handleUseRoute = (route: SavedRoute) => {
    // Restore the route result and switch to route tab
    const routeData = route.route_data as RouteResult;
    if (routeData) {
      setRouteResult(routeData);
      setRoutePathIdx(0);
      setTripSegments([]);
    }
    setNavigateToLandmarkId(null);
    setNavigateFromLandmarkId(null);
    setTab('route');
    const midLat = (route.origin_lat + route.dest_lat) / 2;
    const midLng = (route.origin_lng + route.dest_lng) / 2;
    setCenterLat(midLat);
    setCenterLng(midLng);
    showToast(`Loaded route: ${route.name}`);
  };

  const handleUseTrip = (trip: SavedTrip) => {
    // Restore trip segments and switch to trip tab
    const segs = (trip.segments_data || []) as RouteResult[];
    if (segs.length > 0) {
      setTripSegments(segs);
      setRouteResult(null);
    }
    setTab('trip');
    showToast(`Loaded trip: ${trip.name}`);
  };

  // ──────────────────────────────
  //  Landmark CRUD
  // ──────────────────────────────
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

        // Sync to Redis GEO
        fetch('/api/geo-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', id: newItem.id, latitude: newItem.latitude, longitude: newItem.longitude }),
        }).catch(() => {});
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
        if (selectedLandmark?.id === id) setSelectedLandmark(updated);
        showToast(`Landmark "${updated.name}" updated.`);
      } else {
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

      // Sync removal to Redis GEO
      fetch('/api/geo-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      }).catch(() => {});
    } catch (e: any) {
      console.error('Delete error:', e);
      showToast(`An error occurred while deleting: ${e?.message || e}`);
    }
  };

  // Search nearby (via Redis GEO, with local fallback)
  const handleSearchNearby = async () => {
    const latNum = parseFloat(searchLat);
    const lngNum = parseFloat(searchLng);
    const radKm = parseFloat(searchRadius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radKm) || radKm <= 0) {
      showToast('Please provide a valid latitude, longitude, and radius (km).');
      return;
    }

    setCenterLat(latNum);
    setCenterLng(lngNum);

    try {
      const res = await fetch(`/api/geo-nearby?lat=${latNum}&lng=${lngNum}&radius=${radKm}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();

      const results: { landmark: Landmark; distanceKm: number }[] = [];
      for (const item of data.results) {
        const lm = landmarks.find((l) => l.id === item.id);
        if (lm) {
          results.push({ landmark: lm, distanceKm: item.distanceKm });
        }
      }

      setNearbyResults(results);
      showToast(`Nearby scan complete (Redis GEO): ${results.length} landmark(s) within ${radKm} km.`);
    } catch {
      // Fallback: local Haversine calculation
      const results = landmarks
        .map((landmark) => {
          const dist = calculateHaversineDistance(latNum, lngNum, landmark.latitude, landmark.longitude);
          return { landmark, distanceKm: dist };
        })
        .filter((item) => item.distanceKm <= radKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      setNearbyResults(results);
      showToast(`Nearby scan complete (local): ${results.length} landmark(s) within ${radKm} km.`);
    }
  };

  const handleClearNearby = () => { setNearbyResults(null); };

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

  const handleSetQueryInputs = (lat: number, lng: number) => {
    setSearchLat(lat.toFixed(5));
    setSearchLng(lng.toFixed(5));
    setCenterLat(lat);
    setCenterLng(lng);

    const radKm = parseFloat(searchRadius);
    const effectiveRad = isNaN(radKm) || radKm <= 0 ? 10 : radKm;

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo-nearby?lat=${lat}&lng=${lng}&radius=${effectiveRad}`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        const results: { landmark: Landmark; distanceKm: number }[] = [];
        for (const item of data.results) {
          const lm = landmarks.find((l) => l.id === item.id);
          if (lm) {
            results.push({ landmark: lm, distanceKm: item.distanceKm });
          }
        }
        setNearbyResults(results);
      } catch {
        // Fallback: local calculation
        const results = landmarks
          .map((landmark) => {
            const dist = calculateHaversineDistance(lat, lng, landmark.latitude, landmark.longitude);
            return { landmark, distanceKm: dist };
          })
          .filter((item) => item.distanceKm <= effectiveRad)
          .sort((a, b) => a.distanceKm - b.distanceKm);
        setNearbyResults(results);
      }
    }, 50);
  };

  // Navigate-to / Navigate-from
  const handleNavigateTo = (landmarkId: string) => {
    setNavigateToLandmarkId(landmarkId);
    setNavigateFromLandmarkId(null);
    setRouteResult(null);
    setTripSegments([]);
    setTab('route');
  };

  const handleNavigateFrom = (landmarkId: string) => {
    setNavigateFromLandmarkId(landmarkId);
    setNavigateToLandmarkId(null);
    setRouteResult(null);
    setTripSegments([]);
    setTab('route');
  };

  // Toast
  const showToast = (message: string) => { setToastMessage(message); };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const distanceFromLandmark = landmarks.find((l) => l.id === selectedFromLandmarkId) || null;
  const distanceToLandmark = landmarks.find((l) => l.id === selectedToLandmarkId) || null;
  const nearbyHighlightIds = new Set<string>((nearbyResults || []).map((r) => r.landmark.id));
  const showMap = currentTab === 'home' || currentTab === 'route' || currentTab === 'trip';

  // Toggle body scroll lock when mobile drawer is open
  useEffect(() => {
    if (mobileSidebarOpen && showMap) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }
    return () => document.body.classList.remove('drawer-open');
  }, [mobileSidebarOpen, showMap]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9ff] text-gray-900 font-sans">
      <Header currentTab={currentTab} setTab={setTab} dbStatus={dbStatus} redisStatus={redisStatus} redisGeoCount={redisGeoCount} />

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

      {showMap && (
        <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto overflow-hidden md:min-h-[500px] relative" id="map-workspace">
          {/* Mobile backdrop when sidebar drawer is open */}
          {mobileSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-[80] transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {currentTab === 'home' && (
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
              onNavigateTo={handleNavigateTo}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          )}

          {currentTab === 'route' && (
            <RoutePlanner
              landmarks={landmarks}
              onRouteResult={(result) => {
                setRouteResult(result);
                setTripSegments([]);
                setRoutePathIdx(0);
              }}
              onCenterChange={(lat, lng) => {
                setCenterLat(lat);
                setCenterLng(lng);
              }}
              showToast={showToast}
              initialDestId={navigateToLandmarkId}
              initialOriginId={navigateFromLandmarkId}
              onGpsUpdate={(lat, lng) => setGpsPosition({ lat, lng })}
              onAutoSave={handleAutoSaveRoute}
              lastSavedRouteId={lastSavedRouteId}
              lastSavedRouteFavorite={lastSavedRouteFavorite}
              onToggleFavorite={handleToggleRouteFavorite}
              isLoggedIn={!!user}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          )}

          {currentTab === 'trip' && (
            <TripPlanner
              landmarks={landmarks}
              onTripRoute={(segs) => {
                setTripSegments(segs);
                setRouteResult(null);
              }}
              onCenterChange={(lat, lng) => {
                setCenterLat(lat);
                setCenterLng(lng);
              }}
              showToast={showToast}
              onGpsUpdate={(lat, lng) => setGpsPosition({ lat, lng })}
              onAutoSave={handleAutoSaveTrip}
              lastSavedTripId={lastSavedTripId}
              lastSavedTripFavorite={lastSavedTripFavorite}
              onToggleFavorite={handleToggleTripFavorite}
              isLoggedIn={!!user}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          )}

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
            routeResult={routeResult}
            routePathIdx={routePathIdx}
            tripSegments={tripSegments.length > 0 ? tripSegments : undefined}
            gpsPosition={gpsPosition}
          />

          {/* Mobile floating toggle button for sidebar */}
          <button
            className="md:hidden fixed bottom-4 left-4 z-[100] flex items-center gap-2 px-3 py-2.5 bg-[#003da6] text-white rounded-full shadow-lg active:scale-95 transition-transform"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            {mobileSidebarOpen
              ? <PanelBottomClose className="h-4 w-4" />
              : <PanelBottomOpen className="h-4 w-4" />
            }
            <span className="text-xs font-bold">
              {currentTab === 'home' ? 'Tools' : currentTab === 'route' ? 'Route' : 'Trip'}
            </span>
          </button>
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
          onNavigateTo={handleNavigateTo}
          onNavigateFrom={handleNavigateFrom}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {currentTab === 'add' && (
        <LandmarkAdd
          onAddLandmark={handleAddLandmark}
          setTab={setTab}
          onShowSuccessToast={showToast}
        />
      )}

      {currentTab === 'favorites' && (
        <FavoritesPage
          landmarks={landmarks}
          onNavigateTo={handleNavigateTo}
          showToast={showToast}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          savedRoutes={savedRoutes}
          savedTrips={savedTrips}
          onToggleRouteFavorite={handleToggleRouteFavorite}
          onToggleTripFavorite={handleToggleTripFavorite}
          onUseRoute={handleUseRoute}
          onUseTrip={handleUseTrip}
        />
      )}

      {currentTab === 'history' && (
        <SavedRoutesPage
          savedRoutes={savedRoutes}
          savedTrips={savedTrips}
          landmarks={landmarks}
          onDeleteRoute={handleDeleteRoute}
          onDeleteTrip={handleDeleteTrip}
          onUseRoute={handleUseRoute}
          onUseTrip={handleUseTrip}
          onToggleRouteFavorite={handleToggleRouteFavorite}
          onToggleTripFavorite={handleToggleTripFavorite}
          showToast={showToast}
        />
      )}

      <Footer showLatency={showMap} />

      {editingLandmark && (
        <LandmarkEdit
          landmark={editingLandmark}
          onUpdateLandmark={handleUpdateLandmark}
          onClose={() => setEditingLandmark(null)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal />

      {toastMessage && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:bottom-8 md:right-8 z-[200] max-w-sm md:max-w-sm pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300"
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

export default function App() {
  const [toastForAuth, setToastForAuth] = useState<string | null>(null);

  return (
    <AuthProvider onToast={(msg) => setToastForAuth(msg)}>
      <AppInner />
    </AuthProvider>
  );
}
