import React, { useState, useEffect, useRef } from 'react';
import { Landmark } from '../types';
import { Plus, Minus, Compass, Info, MapPin } from 'lucide-react';

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
}

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
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState<number>(2);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  // We map coordinates centered on centerLat, centerLng.
  // Standard scale: degrees to pixels. Let's make it zoomable.
  const getCoordinates = (lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Projection mathematics: Center coordinate is mapped to (width/2, height/2).
    // Factor adjusts sensitivity of degrees. Zoom multiplies it.
    const lonDiff = lng - centerLng;
    const latDiff = centerLat - lat; // latitude is negative downward on screen

    const scaleX = (width / 50) * zoom;
    const scaleY = (height / 35) * zoom;

    const x = width / 2 + lonDiff * scaleX;
    const y = height / 2 + latDiff * scaleY;

    return { x, y };
  };

  // Zoom controllers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.8, 8));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.8, 0.8));

  const handleRecenter = () => {
    // NYC coordinate
    onCenterChange(40.7128, -74.006);
    setZoom(2);
  };

  // Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== mapRef.current && !(e.target as HTMLElement).classList.contains('map-layer')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !mapRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    const rect = mapRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Convert pixels back to lat/lon degrees
    const scaleX = (width / 50) * zoom;
    const scaleY = (height / 35) * zoom;

    const deltaLng = -dx / scaleX;
    const deltaLat = dy / scaleY;

    onCenterChange(centerLat + deltaLat, centerLng + deltaLng);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Double-click on map to set search center
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const scaleX = (width / 50) * zoom;
    const scaleY = (height / 35) * zoom;

    const lng = centerLng + (clickX - width / 2) / scaleX;
    const lat = centerLat - (clickY - height / 2) / scaleY;

    onMapDoubleClickSetCenter(lat, lng);
  };

  // Connecting line calculation for Distance Tool
  const lineCoords = (() => {
    if (!distanceFrom || !distanceTo) return null;
    const p1 = getCoordinates(distanceFrom.latitude, distanceFrom.longitude);
    const p2 = getCoordinates(distanceTo.latitude, distanceTo.longitude);
    return { p1, p2 };
  })();

  return (
    <div 
      className="flex-grow relative bg-[#dde3ed] overflow-hidden select-none" 
      id="map-viewport-container"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Visual Map Canvas Grid Overlay & Grayscale Image */}
      <div
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
        className={`absolute inset-0 h-full w-full bg-[#dde3ed] transition-all cursor-${isPanning ? 'grabbing' : 'grab'}`}
        id="map-canvas-render"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(0, 61, 166, 0.08) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      >
        <img
          alt="GIS Map Visual Background"
          className="map-layer w-full h-full object-cover mix-blend-multiply opacity-50 grayscale pointer-events-none"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBN1HiSL6I3QTzevmODdvAyxrfJhl5vJZJCryeiLOsDRVNCpzBddWrWEy28pG6VysNtBxmsgjsQl6rrYD5D82bGmtrx7RzQB5fScerL_iqpD3i1ViM2HZPtgQtp32jrLVke-wS3D8tvKxenP9D5JKOwhu2Zqv8nI7jbXEeDWWfcIYtHy8xn2ocrlL_BVguwO3-CGsUq5VuQmLWVGVK4Fle6pXHdglvIr6Dh0xTOOCNxBZIe9vbnqsL2YXG4DrMohNqYLCw1KN8KY1iNR"
        />

        {/* Dynamic Vector Projection SVG Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Distance calculation connector vector line */}
          {lineCoords && lineCoords.p1.x !== 0 && (
            <g>
              <line
                x1={lineCoords.p1.x}
                y1={lineCoords.p1.y}
                x2={lineCoords.p2.x}
                y2={lineCoords.p2.y}
                stroke="#003da6"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                className="animate-[dash_20s_linear_infinite]"
              />
              <circle cx={lineCoords.p1.x} cy={lineCoords.p1.y} r="6" fill="#003da6" />
              <circle cx={lineCoords.p2.x} cy={lineCoords.p2.y} r="6" fill="#003da6" />
              
              {/* Pulsing mid-point label box */}
              <foreignObject
                x={(lineCoords.p1.x + lineCoords.p2.x) / 2 - 60}
                y={(lineCoords.p1.y + lineCoords.p2.y) / 2 - 16}
                width="120"
                height="32"
              >
                <div className="bg-[#003da6] text-white text-[11px] font-bold py-1 px-2.5 rounded-full shadow-lg text-center border border-white/20 flex items-center justify-center gap-1 font-mono">
                  {distanceVal ? `${distanceVal.toFixed(1)} km` : 'GEODIST'}
                </div>
              </foreignObject>
            </g>
          )}

          {/* Radar scan ring matching coordinates on radius query */}
          {centerLat && centerLng && (
            <circle
              cx="50%"
              cy="50%"
              r={zoom * 30}
              className="fill-none stroke-[#003da6]/20 stroke-1"
              style={{ transformOrigin: 'center' }}
            />
          )}
        </svg>

        {/* Landmark Pins Container */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {landmarks.map((landmark) => {
            const pos = getCoordinates(landmark.latitude, landmark.longitude);
            // Hide landmarks out of viewport bound
            if (pos.x < -40 || pos.y < -40 || pos.x > 2000 || pos.y > 1100) return null;

            const isSelected = selectedLandmark?.id === landmark.id;
            const isFrom = distanceFrom?.id === landmark.id;
            const isTo = distanceTo?.id === landmark.id;
            const isHighlighted = highlightedIds.has(landmark.id);

            return (
              <div
                key={landmark.id}
                className="absolute transition-transform duration-200"
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <button
                  onClick={() => onSelectLandmark(landmark)}
                  className="pointer-events-auto relative group flex flex-col items-center cursor-pointer"
                  title={landmark.name}
                >
                  {/* Select highlight glow */}
                  {(isSelected || isHighlighted) && (
                    <div className={`absolute -inset-2.5 border rounded-full animate-ping pointer-events-none ${
                      isSelected ? 'bg-[#003da6]/20 border-[#003da6]/40' : 'bg-amber-400/20 border-amber-400/40'
                    }`} />
                  )}

                  {/* Marker Pin Visual Shape */}
                  <div
                    className={`h-9 w-9 rounded-full border-2 flex items-center justify-center shadow-md transform transition-all duration-300 ${
                      isSelected
                        ? 'bg-[#003da6] text-white border-white scale-110'
                        : isFrom
                        ? 'bg-[#006c47] text-white border-white scale-105'
                        : isTo
                        ? 'bg-[#822600] text-white border-white scale-105'
                        : isHighlighted
                        ? 'bg-amber-500 text-white border-white scale-105'
                        : 'bg-white hover:bg-[#eef4fe] text-[#003da6] border-[#003da6]'
                    }`}
                  >
                    <MapPin className="h-4.5 w-4.5 font-bold" />
                  </div>

                  {/* Dynamic Popover Marker Name Label */}
                  <div
                    className={`mt-1 bg-white border border-[#c3c6d7] text-gray-900 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap shadow-sm group-hover:opacity-100 group-hover:scale-100 ${
                      isSelected
                        ? 'opacity-100 scale-100 border-[#003da6] text-[#003da6]'
                        : 'opacity-0 scale-95 origin-bottom duration-150'
                    }`}
                  >
                    {landmark.name}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Center / Search Center Marker */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          id="search-center-marker"
        >
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute h-10 w-10 bg-[#003da6]/10 border border-[#003da6]/20 rounded-full animate-ping" />
            <div className="h-3 w-3 bg-[#003da6] border border-white rounded-full shadow-lg" />
            
            <div className="absolute top-5 bg-white border border-[#c3c6d7] shadow-md rounded-lg py-1 px-3 whitespace-nowrap flex items-center gap-1.5 border-b-2 border-b-[#003da6]">
              <Compass className="h-3.5 w-3.5 text-[#003da6] spin-animation" />
              <span className="text-[10px] font-extrabold text-gray-800 tracking-tight uppercase">Search Center</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Control Overlay deck (Upper Right) */}
      <div className="absolute top-6 right-6 flex flex-col gap-2.5 z-30" id="map-actions-deck">
        <div className="flex flex-col bg-white rounded-xl shadow-lg border border-[#c3c6d7] overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-3 bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-100 transition-colors flex items-center justify-center hover:text-[#003da6]"
            title="Zoom In"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-3 bg-white hover:bg-gray-50 text-gray-800 transition-colors flex items-center justify-center hover:text-[#003da6]"
            title="Zoom Out"
          >
            <Minus className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>

        <button
          onClick={handleRecenter}
          className="bg-white p-3 rounded-xl shadow-lg border border-[#c3c6d7] text-gray-700 hover:text-[#003da6] hover:bg-gray-50 transition-all flex items-center justify-center"
          title="Reset to NYC Center"
        >
          <Compass className="h-4.5 w-4.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Viewport Floating Info Card (Lower Left) */}
      <div 
        className="absolute bottom-6 left-6 p-5 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-[#c3c6d7] w-72 z-30 transition-all hover:bg-white" 
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
            <p className="text-xs font-mono font-bold text-gray-900">{centerLat.toFixed(4)}°N</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Center Long</p>
            <p className="text-xs font-mono font-bold text-gray-900">{centerLng.toFixed(4)}°E</p>
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
