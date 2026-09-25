import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Tooltip, ZoomControl } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent, PathOptions } from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { Dashboard } from '../lib/api';
import { aqiBand, formatNumber, timeAgo } from '../lib/format';
import { loadProvinces } from '../lib/provinces';

export type Layers = { fires: boolean; quakes: boolean; air: boolean };

interface DataMapProps {
  data: Dashboard | null;
  layers: Layers;
  selected: string | null;
  onSelect: (province: string | null) => void;
}

const FIRE = '#f0714e';
const QUAKE = '#e8b84a';
const MOSS = '#a3b46b';

// Esri's dark canvas is free to use with attribution (CARTO now needs an API key).
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

// AQI stations are labelled pins so they never read as fire or quake dots.
const aqiIcon = (aqi: number, color: string) =>
  divIcon({
    className: '',
    html: `<span class="aqi-pin" style="--c:${color}">${aqi}</span>`,
    iconSize: [34, 20],
    iconAnchor: [17, 10],
  });


const provinceName = (feature?: Feature) => (feature?.properties?.name as string | undefined) ?? '';

export default function DataMap({ data, layers, selected, onSelect }: DataMapProps) {
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const geoRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    loadProvinces().then(setProvinces).catch(() => setProvinces(null));
  }, []);

  const fireCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data?.fires.by_province.forEach((p) => counts.set(p.province, p.count));
    return counts;
  }, [data]);
  const maxFires = Math.max(1, ...fireCounts.values());

  // Leaflet binds handlers once per feature; read the latest values through refs.
  const latest = useRef({ selected, onSelect, fireCounts, maxFires });
  latest.current = { selected, onSelect, fireCounts, maxFires };

  const styleFor = (name: string, hovered = false): PathOptions => {
    const { selected, fireCounts, maxFires } = latest.current;
    const intensity = (fireCounts.get(name) ?? 0) / maxFires;
    const isSelected = selected === name;
    return {
      fillColor: FIRE,
      fillOpacity: 0.03 + intensity * 0.42,
      color: isSelected ? MOSS : hovered ? 'rgba(242,238,232,0.55)' : 'rgba(242,238,232,0.16)',
      weight: isSelected ? 2 : hovered ? 1.4 : 0.8,
    };
  };

  const tooltipFor = (name: string) => {
    const count = latest.current.fireCounts.get(name) ?? 0;
    return `<strong>${name}</strong><br/><span style="opacity:.6">${formatNumber(count)} fire hotspot${count === 1 ? '' : 's'}</span>`;
  };

  // Restyle when the data or selection changes
  useEffect(() => {
    geoRef.current?.eachLayer((layer) => {
      const l = layer as Layer & { feature?: Feature; setStyle: (s: PathOptions) => void; setTooltipContent: (c: string) => void };
      const name = provinceName(l.feature);
      l.setStyle(styleFor(name));
      l.setTooltipContent(tooltipFor(name));
    });
  }, [fireCounts, selected, provinces]);

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const name = provinceName(feature);
    layer.bindTooltip(tooltipFor(name), { sticky: true, className: 'bumi-tip', direction: 'top', offset: [0, -8] });
    layer.on({
      mouseover: (e: LeafletMouseEvent) => e.target.setStyle(styleFor(name, true)),
      mouseout: (e: LeafletMouseEvent) => e.target.setStyle(styleFor(name)),
      click: () => latest.current.onSelect(latest.current.selected === name ? null : name),
    });
  };

  return (
    <MapContainer
      center={[-2.4, 118]}
      zoom={5}
      minZoom={4}
      maxZoom={10}
      maxBounds={[
        [-16, 88],
        [12, 150],
      ]}
      preferCanvas
      zoomControl={false}
      scrollWheelZoom
      className="isolate h-full w-full"
    >
      <ZoomControl position="bottomright" />
      <TileLayer url={`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`} attribution={ESRI_ATTRIBUTION} />
      <TileLayer url={`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`} opacity={0.55} />

      {provinces && (
        <GeoJSON
          ref={geoRef}
          data={provinces}
          style={(f) => styleFor(provinceName(f))}
          onEachFeature={onEachFeature}
        />
      )}

      {layers.fires &&
        data?.fires.points.map((p, i) => (
          <CircleMarker
            key={`f${i}-${p.timestamp}`}
            center={[p.lat, p.lon]}
            radius={Math.min(6, 2 + Math.sqrt(p.frp ?? 1) / 3)}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: FIRE, fillOpacity: 0.75 }}
          />
        ))}

      {layers.quakes &&
        data?.earthquakes.events.map((q, i) => (
          <CircleMarker
            key={`q${i}-${q.timestamp}`}
            center={[q.lat, q.lon]}
            radius={Math.max(5, 5 + ((q.magnitude ?? 3) - 3) * 4)}
            pathOptions={{ color: QUAKE, weight: 2, fillColor: QUAKE, fillOpacity: 0.08 }}
          >
            <Tooltip className="bumi-tip" direction="top" offset={[0, -6]}>
              <strong>M{q.magnitude?.toFixed(1) ?? '?'} earthquake</strong>
              <br />
              <span style={{ opacity: 0.7 }}>{q.description || q.province}</span>
              <br />
              <span style={{ opacity: 0.5 }}>
                {q.depth_km != null ? `${q.depth_km} km deep · ` : ''}
                {timeAgo(q.timestamp)}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

      {layers.air &&
        data?.air.stations
          .filter((s) => s.lat != null && s.lon != null)
          .map((s) => {
            const band = aqiBand(s.aqi);
            return (
              <Marker key={s.city} position={[s.lat!, s.lon!]} icon={aqiIcon(s.aqi, band.color)} riseOnHover>
                <Tooltip className="bumi-tip" direction="top" offset={[0, -8]}>
                  <strong>{s.city.split(',')[0]}</strong>
                  <br />
                  <span style={{ color: band.color }}>AQI {s.aqi}</span>
                  <span style={{ opacity: 0.6 }}> · {band.label}</span>
                  <br />
                  <span style={{ opacity: 0.5 }}>{timeAgo(s.timestamp)}</span>
                </Tooltip>
              </Marker>
            );
          })}
    </MapContainer>
  );
}
