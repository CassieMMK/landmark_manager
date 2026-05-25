export interface Landmark {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  geohash: string;
  created_at?: string;
}

export type AppTab = 'home' | 'list' | 'add';

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
