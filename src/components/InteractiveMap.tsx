import React, { useEffect, useRef, useMemo } from 'react';
import { Landmark } from '../types';
import { Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteResult } from '../services/amap';

interface InteractiveMapProps {
  landmarks: Landmark[];
  centerLat: number;
  centerLng: number;
  onCenterChange: (lat: number, lng: number) => void;
  onMapDoubleClickSetCenter: (lat: number, lng: number) => void;
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  distanceFrom?: Landmark | null;
  distanceTo?: Landmark | null;
  distanceVal?: number | null;
  highlightedIds: Set<string>;
  // Route overlay
  routeResult?: RouteResult | null;
  routePathIdx?: number;
  // Trip overlay (multiple segments)
  tripSegments?: RouteResult[];
  // GPS user location
  gpsPosition?: { lat: number; lng: number } | null;
}

// ---- Custom icon factories ----
function createIcon(color: string, size: number = 28) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`;
  return L.divIcon({
    html: svg,
    className: 'leaflet-landmark-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function createNumberedIcon(color: string, num: number, size: number = 32) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><text x="12" y="13" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="sans-serif">${num}</text></svg>`;
  return L.divIcon({
    html: svg,
    className: 'leaflet-landmark-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const defaultIcon = createIcon('#003da6');
const selectedIcon = createIcon('#003da6', 36);
const fromIcon = createIcon('#006c47', 32);
const toIcon = createIcon('#822600', 32);
const highlightIcon = createIcon('#f59e0b', 32);

// Route endpoint icons
const routeStartIcon = createIcon('#006c47', 34);
const routeEndIcon = createIcon('#822600', 34);

// Search center icon (pulsing blue dot via CSS)
const searchCenterIcon = L.divIcon({
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(0,61,166,0.15);border:1px solid rgba(0,61,166,0.3);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:#003da6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
  </div>`,
  className: 'leaflet-search-center-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// GPS user position icon (solid blue dot with pulse ring)
const gpsPositionIcon = L.divIcon({
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(0,100,255,0.12);border:2px solid rgba(0,100,255,0.25);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#0064ff;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>
  </div>`,
  className: 'leaflet-gps-position-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Route color map
const ROUTE_COLORS: Record<string, string> = {
  walking:   '#003da6',  // blue
  driving:   '#006c47',  // green
  bicycling: '#c2410c',  // orange
};

// Multi-segment colors for trip
const TRIP_COLORS = ['#003da6', '#006c47', '#c2410c', '#7c3aed', '#be185d'];

export default function InteractiveMap({
  landmarks,
  centerLat,
  centerLng,
  onCenterChange,
  onMapDoubleClickSetCenter,
  selectedLandmark,
  onSelectLandmark,
  distanceFrom,
  distanceTo,
  distanceVal,
  highlightedIds,
  routeResult,
  routePathIdx = 0,
  tripSegments,
  gpsPosition,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const searchCenterMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const distanceLabelRef = useRef<L.Marker | null>(null);
  const isProgrammaticMove = useRef(false);

  // Route layers
  const routeLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // GPS user position marker
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const gpsCircleRef = useRef<L.CircleMarker | null>(null);

  // ---- 1. Initialize map once ----
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 3,
      zoomControl: false,          // we add our own control below
      doubleClickZoom: false,      // double-click used to set search center
      attributionControl: true,
    });

    // OpenStreetMap tile layer (free, no API key, accessible in China)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add marker layer group
    markersLayerRef.current.addTo(map);

    // Add route layer group
    routeLayerRef.current.addTo(map);

    // Search center marker
    const scMarker = L.marker([centerLat, centerLng], {
      icon: searchCenterIcon,
      interactive: false,
      zIndexOffset: -100,
    }).addTo(map);
    searchCenterMarkerRef.current = scMarker;

    // Events
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      onMapDoubleClickSetCenter(e.latlng.lat, e.latlng.lng);
    });

    map.on('moveend', () => {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
    });

    mapInstanceRef.current = map;

    // Ensure map resizes correctly when container dimensions change
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current!);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 2. Fly to new center when parent changes it ----
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const currentCenter = map.getCenter();
    const dist = Math.abs(currentCenter.lat - centerLat) + Math.abs(currentCenter.lng - centerLng);
    if (dist > 0.0001) {
      isProgrammaticMove.current = true;
      map.flyTo([centerLat, centerLng], map.getZoom(), { duration: 0.6 });
    }
    // Update search center marker
    searchCenterMarkerRef.current?.setLatLng([centerLat, centerLng]);
  }, [centerLat, centerLng]);

  // ---- 3. Determine icon for each landmark ----
  const getIconForLandmark = (landmark: Landmark) => {
    if (selectedLandmark?.id === landmark.id) return selectedIcon;
    if (distanceFrom?.id === landmark.id) return fromIcon;
    if (distanceTo?.id === landmark.id) return toIcon;
    if (highlightedIds.has(landmark.id)) return highlightIcon;
    return defaultIcon;
  };

  // ---- 4. Sync landmark markers ----
  useEffect(() => {
    const layer = markersLayerRef.current;
    layer.clearLayers();

    landmarks.forEach((lm) => {
      const icon = getIconForLandmark(lm);
      const marker = L.marker([lm.latitude, lm.longitude], { icon });

      // Tooltip (name label)
      marker.bindTooltip(lm.name, {
        direction: 'top',
        offset: [0, -30],
        className: 'leaflet-landmark-tooltip',
      });

      // If selected, keep tooltip open permanently
      if (selectedLandmark?.id === lm.id) {
        marker.on('add', () => marker.openTooltip());
      }

      marker.on('click', () => onSelectLandmark(lm));
      marker.addTo(layer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks, selectedLandmark, distanceFrom, distanceTo, highlightedIds]);

  // ---- 5. Distance line between two landmarks ----
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous
    if (distanceLineRef.current) {
      map.removeLayer(distanceLineRef.current);
      distanceLineRef.current = null;
    }
    if (distanceLabelRef.current) {
      map.removeLayer(distanceLabelRef.current);
      distanceLabelRef.current = null;
    }

    if (distanceFrom && distanceTo) {
      const latlngs: L.LatLngExpression[] = [
        [distanceFrom.latitude, distanceFrom.longitude],
        [distanceTo.latitude, distanceTo.longitude],
      ];

      const line = L.polyline(latlngs, {
        color: '#003da6',
        weight: 3,
        dashArray: '8, 6',
        opacity: 0.8,
      }).addTo(map);
      distanceLineRef.current = line;

      // Mid-point label
      if (distanceVal !== null && distanceVal !== undefined) {
        const midLat = (distanceFrom.latitude + distanceTo.latitude) / 2;
        const midLng = (distanceFrom.longitude + distanceTo.longitude) / 2;
        const labelText = distanceVal < 1
          ? `${(distanceVal * 1000).toFixed(0)} m`
          : `${distanceVal.toFixed(2)} km`;

        const labelIcon = L.divIcon({
          html: `<div style="background:#003da6;color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;font-family:monospace;border:1px solid rgba(255,255,255,0.2)">${labelText}</div>`,
          className: 'leaflet-distance-label',
          iconAnchor: [40, 12],
        });

        const labelMarker = L.marker([midLat, midLng], {
          icon: labelIcon,
          interactive: false,
          zIndexOffset: 1000,
        }).addTo(map);
        distanceLabelRef.current = labelMarker;
      }
    }
  }, [distanceFrom, distanceTo, distanceVal]);

  // ---- 5.5 GPS user position marker ----
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous
    if (gpsMarkerRef.current) {
      map.removeLayer(gpsMarkerRef.current);
      gpsMarkerRef.current = null;
    }
    if (gpsCircleRef.current) {
      map.removeLayer(gpsCircleRef.current);
      gpsCircleRef.current = null;
    }

    if (gpsPosition) {
      // Accuracy circle (light blue)
      const circle = L.circleMarker([gpsPosition.lat, gpsPosition.lng], {
        radius: 30,
        color: 'rgba(0,100,255,0.2)',
        fillColor: 'rgba(0,100,255,0.07)',
        fillOpacity: 1,
        weight: 1,
        interactive: false,
      }).addTo(map);
      gpsCircleRef.current = circle;

      // Position marker
      const marker = L.marker([gpsPosition.lat, gpsPosition.lng], {
        icon: gpsPositionIcon,
        zIndexOffset: 900,
        interactive: false,
      }).addTo(map);
      marker.bindTooltip('Your Location', {
        direction: 'top',
        offset: [0, -20],
        className: 'leaflet-landmark-tooltip',
      });
      gpsMarkerRef.current = marker;
    }
  }, [gpsPosition]);

  // ---- 6. Route overlay (single route) ----
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map) return;

    routeLayer.clearLayers();

    // If we have trip segments, render them instead
    if (tripSegments && tripSegments.length > 0) {
      const allLatLngs: L.LatLng[] = [];

      tripSegments.forEach((seg, segIdx) => {
        const path = seg.paths[0];
        if (!path?.polyline?.length) return;

        const color = TRIP_COLORS[segIdx % TRIP_COLORS.length];
        const latlngs: L.LatLngExpression[] = path.polyline.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);

        // Draw route line
        const line = L.polyline(latlngs, {
          color,
          weight: 5,
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
        });
        line.addTo(routeLayer);

        latlngs.forEach((ll) => allLatLngs.push(L.latLng(ll as [number, number])));

        // Start marker for this segment
        if (path.polyline.length > 0) {
          const [sLng, sLat] = path.polyline[0];
          const startMarker = L.marker([sLat, sLng], {
            icon: createNumberedIcon(color, segIdx + 1),
            zIndexOffset: 500,
          });
          startMarker.bindTooltip(`Leg ${segIdx + 1} Start`, { direction: 'top', offset: [0, -34] });
          startMarker.addTo(routeLayer);
        }

        // End marker for last segment
        if (segIdx === tripSegments.length - 1 && path.polyline.length > 0) {
          const lastPt = path.polyline[path.polyline.length - 1];
          const endMarker = L.marker([lastPt[1], lastPt[0]], {
            icon: routeEndIcon,
            zIndexOffset: 500,
          });
          endMarker.bindTooltip('Destination', { direction: 'top', offset: [0, -36] });
          endMarker.addTo(routeLayer);
        }

        // Turn-by-turn node markers
        path.steps.forEach((step, stepIdx) => {
          if (step.polyline.length > 0) {
            const [tLng, tLat] = step.polyline[0];
            const turnDot = L.circleMarker([tLat, tLng], {
              radius: 4,
              color: 'white',
              fillColor: color,
              fillOpacity: 1,
              weight: 2,
            });
            if (step.instruction) {
              turnDot.bindPopup(
                `<div style="font-size:12px;font-weight:600;max-width:200px">${step.instruction}</div>`,
                { closeButton: false, offset: [0, -4] },
              );
            }
            turnDot.addTo(routeLayer);
          }
        });
      });

      // Fit bounds
      if (allLatLngs.length > 1) {
        const bounds = L.latLngBounds(allLatLngs);
        isProgrammaticMove.current = true;
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
      return;
    }

    // Single route
    if (!routeResult) return;
    const path = routeResult.paths[routePathIdx] || routeResult.paths[0];
    if (!path?.polyline?.length) return;

    const routeColor = ROUTE_COLORS[routeResult.mode] || '#003da6';
    const latlngs: L.LatLngExpression[] = path.polyline.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);

    // Route polyline
    const routeLine = L.polyline(latlngs, {
      color: routeColor,
      weight: 5,
      opacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round',
    });
    routeLine.addTo(routeLayer);

    // Start marker
    const [startLng, startLat] = path.polyline[0];
    const startMarker = L.marker([startLat, startLng], {
      icon: routeStartIcon,
      zIndexOffset: 500,
    });
    startMarker.bindTooltip('Origin', { direction: 'top', offset: [0, -36], className: 'leaflet-landmark-tooltip' });
    startMarker.addTo(routeLayer);

    // End marker
    const lastPt = path.polyline[path.polyline.length - 1];
    const endMarker = L.marker([lastPt[1], lastPt[0]], {
      icon: routeEndIcon,
      zIndexOffset: 500,
    });
    endMarker.bindTooltip('Destination', { direction: 'top', offset: [0, -36], className: 'leaflet-landmark-tooltip' });
    endMarker.addTo(routeLayer);

    // Turn-by-turn node markers (clickable)
    path.steps.forEach((step, idx) => {
      if (step.polyline.length > 0) {
        const [tLng, tLat] = step.polyline[0];
        const turnDot = L.circleMarker([tLat, tLng], {
          radius: 5,
          color: 'white',
          fillColor: routeColor,
          fillOpacity: 1,
          weight: 2,
        });
        if (step.instruction) {
          turnDot.bindPopup(
            `<div style="font-size:12px;font-weight:600;max-width:220px">${step.instruction}</div>`,
            { closeButton: false, offset: [0, -4] },
          );
        }
        turnDot.addTo(routeLayer);
      }
    });

    // Auto-fit bounds
    if (latlngs.length > 1) {
      const bounds = routeLine.getBounds();
      isProgrammaticMove.current = true;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [routeResult, routePathIdx, tripSegments]);

  // Current center for info card
  const map = mapInstanceRef.current;
  const displayLat = map ? map.getCenter().lat : centerLat;
  const displayLng = map ? map.getCenter().lng : centerLng;

  return (
    <div className="flex-grow relative overflow-hidden select-none isolate" id="map-viewport-container">
      {/* Leaflet map container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Viewport Floating Info Card (Lower Left) — hidden on mobile */}
      <div
        className="hidden md:block absolute bottom-6 left-6 p-5 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-[#c3c6d7] w-72 z-[400] transition-all hover:bg-white pointer-events-auto"
        id="viewport-infocard"
      >
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-bold tracking-tight text-gray-800">Viewport Info</h3>
          <span className="px-2 py-0.5 bg-[#78fbbb]/20 text-[#00734b] text-[9px] font-extrabold tracking-wider rounded uppercase border border-[#006c47]/10">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#c3c6d7]/60">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Center Lat</p>
            <p className="text-xs font-mono font-bold text-gray-900">{centerLat.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Center Lng</p>
            <p className="text-xs font-mono font-bold text-gray-900">{centerLng.toFixed(4)}</p>
          </div>
        </div>

        <div className="pt-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">Data Source</p>
          <p className="text-xs font-bold text-[#003da6] font-mono tracking-wider">
            Supabase / Haversine
          </p>
          <p className="text-[10px] text-gray-400 mt-1 italic leading-relaxed">
            Drag to pan, double-click to set search center.
          </p>
        </div>
      </div>
    </div>
  );
}
