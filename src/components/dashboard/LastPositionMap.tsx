import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useTheme } from '../../theme/ThemeContext';
import type { LastKnownTrack } from '../../services/api';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function LastPositionMap({ track }: { track: LastKnownTrack }) {
  const { theme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const firstPoint = track.points[0];
  const lastPoint = track.lastPoint;

  useEffect(() => {
    if (!mapRef.current || !track.points.length) return;
    mapRef.current.fitBounds(L.latLngBounds(track.points), { padding: [40, 40], maxZoom: 18 });
  }, [track]);

  return (
    <div className="overflow-hidden rounded-btn border border-border" style={{ height: '300px' }}>
      <MapContainer
        ref={mapRef}
        center={lastPoint}
        zoom={17}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'var(--surface-2)' }}
      >
        <TileLayer
          key={theme}
          url={tileUrl}
          attribution="© OpenStreetMap contributors © CARTO"
          maxZoom={19}
        />
        <Polyline
          positions={track.points}
          pathOptions={{ color: '#0d9488', weight: 3, opacity: 0.8 }}
        />
        {/* Start marker */}
        <CircleMarker
          center={firstPoint}
          radius={4}
          pathOptions={{ color: '#0d9488', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
        />
        {/* End halo */}
        <CircleMarker
          center={lastPoint}
          radius={16}
          pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.2, weight: 0 }}
        />
        {/* End dot */}
        <CircleMarker
          center={lastPoint}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#0d9488', fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <div><strong>{formatDate(track.date)}</strong></div>
              <div style={{ color: '#888' }}>{track.mission}</div>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
