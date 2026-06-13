import { Landmark } from './types';

/**
 * Standard BASE32 Geohash Encoder
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = 7): string {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let geohash = "";
  let isEven = true;
  let bit = 0;
  let ch = 0;

  // Safeguard coordinates
  const lat = Math.max(-90, Math.min(90, latitude));
  const lon = Math.max(-180, Math.min(180, longitude));

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch = (ch << 1) | 1;
        lonMin = mid;
      } else {
        ch = (ch << 1) | 0;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch = (ch << 1) | 0;
        latMax = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

/**
 * Calculates geodesic distance using the Haversine formula
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(3)); // 3 decimal places precision
}

/**
 * Default Seed Landmark Database
 */
export const DEFAULT_LANDMARKS: Landmark[] = [
  {
    id: "9901",
    name: "Empire State Building",
    category: "Historic Symbol",
    latitude: 40.7484,
    longitude: -73.9857,
    geohash: "dr5ru7p"
  },
  {
    id: "9902",
    name: "Golden Gate Bridge",
    category: "Public Infrastructure",
    latitude: 37.8199,
    longitude: -122.4783,
    geohash: "9q8zhh1"
  },
  {
    id: "9903",
    name: "Eiffel Tower",
    category: "Global Landmark",
    latitude: 48.8584,
    longitude: 2.2945,
    geohash: "u09tunq"
  },
  {
    id: "9904",
    name: "Statue of Liberty",
    category: "Historic Symbol",
    latitude: 40.6892,
    longitude: -74.0445,
    geohash: "dr5regy"
  },
  {
    id: "9905",
    name: "Tokyo Skytree",
    category: "Smart Infrastructure",
    latitude: 35.7100,
    longitude: 139.8107,
    geohash: "wyxr9gy"
  },
  {
    id: "9906",
    name: "Sydney Opera House",
    category: "Global Landmark",
    latitude: -33.8568,
    longitude: 151.2153,
    geohash: "r3gx2fc"
  },
  {
    id: "9907",
    name: "Colosseum",
    category: "Classic Heritage Site",
    latitude: 41.8902,
    longitude: 12.4922,
    geohash: "sr3xd8d"
  },
  {
    id: "9908",
    name: "Burj Khalifa",
    category: "Modern Architecture",
    latitude: 25.1972,
    longitude: 55.2744,
    geohash: "thrrctv"
  },
  {
    id: "9909",
    name: "Taj Mahal",
    category: "Classic Heritage Site",
    latitude: 27.1750,
    longitude: 78.0421,
    geohash: "tsz18v1"
  },
  {
    id: "9910",
    name: "Machu Picchu",
    category: "Archaeological Site",
    latitude: -13.1631,
    longitude: -72.5450,
    geohash: "6mc23df"
  }
];

/**
 * Filter categories for easy dropdown option generation
 */
export const LANDMARK_CATEGORIES = [
  "All Categories",
  "Historic Symbol",
  "Public Infrastructure",
  "Global Landmark",
  "Smart Infrastructure",
  "Classic Heritage Site",
  "Modern Architecture",
  "Archaeological Site",
  "Uncategorized"
];
