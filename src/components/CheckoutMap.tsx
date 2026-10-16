'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, X, MapPin, Loader2 } from 'lucide-react';

// Fix Leaflet's default icon path issues with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  staticLocation?: { lat: number; lng: number; label?: string };
  isStatic?: boolean;
}

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

/** Flies to a given location and notifies parent */
function FlyToLocation({ target, onLocationSelect }: { target: L.LatLng | null; onLocationSelect?: (lat: number, lng: number) => void }) {
  const map = useMap();
  const cbRef = useRef(onLocationSelect);
  cbRef.current = onLocationSelect;
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 1.2 });
      if (cbRef.current) cbRef.current(target.lat, target.lng);
    }
  }, [target, map]);
  return null;
}

function LocationMarker({ onLocationSelect, searchTarget }: { onLocationSelect?: (lat: number, lng: number) => void; searchTarget: L.LatLng | null }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onLocationSelect) onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
    locationfound(e) {
      setPosition(e.latlng);
      if (onLocationSelect) onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    map.locate();
  }, [map]);

  // When search result is selected, update the marker
  useEffect(() => {
    if (searchTarget) {
      setPosition(searchTarget);
    }
  }, [searchTarget]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function CheckoutMap({ onLocationSelect, staticLocation, isStatic = false }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const defaultCenter: [number, number] = isStatic && staticLocation ? [staticLocation.lat, staticLocation.lng] : [30.0444, 31.2357];
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchTarget, setSearchTarget] = useState<L.LatLng | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search using Nominatim
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=eg&limit=5`);
        const data = await res.json();
        setResults(data || []);
        setShowResults(true);
      } catch (err) {
        console.error('Map search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const target = new L.LatLng(lat, lng);
    setSearchTarget(target);
    if (onLocationSelect) onLocationSelect(lat, lng);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setShowResults(false);
  };

  if (!isMounted) {
    return (
      <div style={{ height: '300px', width: '100%', borderRadius: '12px', background: '#3B2116', border: '1.5px solid var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '0.9rem' }}>
        Loading map...
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ width: '100%' }}>
      {/* Search Input Bar (only shown in delivery mode) */}
      {!isStatic && (
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--off-white)',
            border: '1.5px solid var(--pink)',
            borderRadius: '12px',
            padding: '8px 14px',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(99, 61, 45, 0.06)',
          }}>
            {isSearching ? (
              <Loader2 size={18} color="var(--brown-light)" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Search size={18} color="var(--brown-light)" />
            )}
            <input
              type="text"
              placeholder="Search address or area (e.g. Maadi, Tagamoa...)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowResults(true); }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.9rem',
                color: 'var(--brown)',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--brown-light)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showResults && results.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1.5px solid var(--pink)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(99, 61, 45, 0.12)',
              overflow: 'hidden',
              zIndex: 30,
            }}>
              {results.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--brown)',
                    borderBottom: idx < results.length - 1 ? '1px solid var(--pink-light, #fce0e6)' : 'none',
                    transition: '0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pink-light, #fff5f7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <MapPin size={16} color="var(--brown-light)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.4 }}>{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid var(--pink)', zIndex: 10 }}>
        <MapContainer key={`leaflet-map-${defaultCenter[0]}-${defaultCenter[1]}-${isStatic ? 'static' : 'dynamic'}`} center={defaultCenter} zoom={isStatic ? 14 : 11} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {isStatic && staticLocation ? (
            <Marker position={[staticLocation.lat, staticLocation.lng]}></Marker>
          ) : (
            <>
              <LocationMarker onLocationSelect={onLocationSelect} searchTarget={searchTarget} />
              <FlyToLocation target={searchTarget} onLocationSelect={onLocationSelect} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
