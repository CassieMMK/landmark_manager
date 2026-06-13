export interface Landmark {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  geohash: string;
  created_at?: string;
}

export type AppTab = 'home' | 'list' | 'add' | 'route' | 'trip' | 'favorites' | 'history';

// ---- Auth & user data types ----

export interface Favorite {
  id: string;
  user_id: string;
  landmark_id: string;
  created_at: string;
}

export interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  mode: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  origin_name: string;
  dest_name: string;
  strategy: number;
  route_data: any;        // serialized RouteResult
  is_favorite: boolean;
  created_at: string;
}

export interface SavedTrip {
  id: string;
  user_id: string;
  name: string;
  mode: string;
  waypoint_ids: string[]; // landmark IDs in order
  waypoint_names: string[];
  use_gps_start: boolean;
  gps_lat?: number;
  gps_lng?: number;
  segments_data: any;     // serialized RouteResult[]
  is_favorite: boolean;
  created_at: string;
}

export interface SearchNearbyParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface NearbyResult {
  landmark: Landmark;
  distanceKm: number;
}

export interface DistanceResult {
  fromLandmark: Landmark;
  toLandmark: Landmark;
  distanceKm: number;
}
