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
  onLocationSelect: (lat: number, lng: number) => void;
}

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

/** Flies to a given location and notifies parent */
function FlyToLocation({ target, onLocationSelect }: { target: L.LatLng | null; onLocationSelect: (lat: number, lng: number) => void }) {
  const map = useMap();
  const cbRef = useRef(onLocationSelect);
  cbRef.current = onLocationSelect;
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 1.2 });
      cbRef.current(target.lat, target.lng);
    }
  }, [target, map]);
  return null;
}

function LocationMarker({ onLocationSelect, searchTarget }: MapProps & { searchTarget: L.LatLng | null }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
    locationfound(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
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

export default function CheckoutMap({ onLocationSelect }: MapProps) {
  const defaultCenter: [number, number] = [30.0444, 31.2357];
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchTarget, setSearchTarget] = useState<L.LatLng | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=eg&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch (err) {
        console.error('Geocoding failed:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchTarget(L.latLng(lat, lng));
    setSearchQuery(result.display_name.split(',').slice(0, 3).join(','));
    setShowResults(false);
    setResults([]);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Search Bar */}
      <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '10px', zIndex: 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--off-white)',
          border: '1.5px solid var(--pink)',
          borderRadius: '12px',
          padding: '0 12px',
          transition: '0.2s',
        }}>
          <Search size={18} color="var(--brown-light)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            placeholder="Search for an address or area..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '12px 10px',
              fontSize: '0.88rem',
              color: 'var(--brown)',
              outline: 'none',
            }}
          />
          {isSearching && <Loader2 size={16} color="var(--brown-light)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
          {searchQuery && !isSearching && (
            <button 
              onClick={() => { setSearchQuery(''); setResults([]); setShowResults(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
            >
              <X size={16} color="var(--brown-light)" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--white, #fff)',
            border: '1px solid var(--pink)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(99, 61, 45, 0.12)',
            overflow: 'hidden',
            zIndex: 30,
          }}>
            {results.map((r, idx) => (
              <button
                key={idx}
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

      {/* Map */}
      <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--brown-light)', zIndex: 10 }}>
        <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationSelect={onLocationSelect} searchTarget={searchTarget} />
          <FlyToLocation target={searchTarget} onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>
    </div>
  );
}
