import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { useTheme } from '../../theme/ThemeContext';
import type { PatrolTrack } from '../../services/mock';

export function PatrolMap({ tracks }: { tracks: PatrolTrack[] }) {
  const { theme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Sort tracks chronologically so first/last markers anchor the correct ends.
  const sorted = [...tracks].sort((a, b) => a.date.localeCompare(b.date));
  const allPoints = sorted.flatMap((t) => t.points);
  const center = (allPoints[0] ?? [48.967, 9.123]) as [number, number];

  // One global start/end marker for the entire period.
  const firstPoint = sorted[0]?.points[0] ?? null;
  const lastTrack = sorted[sorted.length - 1];
  const lastPoint = lastTrack?.points[lastTrack.points.length - 1] ?? null;

  // Fit to trace bounds whenever tracks change (period selector or robot switch).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !allPoints.length) return;
    mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 15 });
  }, [tracks]);

  return (
    // Explicit height required — Leaflet renders blank without it.
    <div className="overflow-hidden rounded-btn border border-border" style={{ height: '500px' }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'var(--surface-2)' }}
      >
        {/* key={theme} forces a fresh tile layer when the theme flips */}
        <TileLayer
          key={theme}
          url={tileUrl}
          attribution="© OpenStreetMap contributors © CARTO"
          maxZoom={19}
        />

        {/* ONE polyline per patrol round — rounds are never joined */}
        {sorted.map((t) => (
          <Polyline
            key={t.mission}
            positions={t.points}
            pathOptions={{ color: '#2dd4bf', weight: 2.5, opacity: 0.85 }}
          />
        ))}

        {/* Single start marker — first GPS point of the selected period */}
        {firstPoint && (
          <CircleMarker
            center={firstPoint}
            radius={6}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>Départ</Tooltip>
          </CircleMarker>
        )}

        {/* Single end marker — last GPS point of the selected period */}
        {lastPoint && (
          <CircleMarker
            center={lastPoint}
            radius={6}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>Arrivée</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
