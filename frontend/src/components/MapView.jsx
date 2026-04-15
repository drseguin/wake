/**
 * MapView — Leaflet wrapper for WAKE's marine dashboard.
 *
 * @fileoverview Renders an OSM base layer with the OpenSeaMap seamarks
 * overlay and shows the current device position via the Geolocation API.
 * Designed to fill its parent container — caller controls the height.
 *
 * Future iterations will accept waypoint and crew-member layers as props.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import logger from '../utils/logger';

// Vite re-bundles asset URLs; rewire Leaflet's default icon paths.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const DEFAULT_CENTER = [44.34, -76.16]; // Gananoque, ON
const DEFAULT_ZOOM = 12;

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SEAMARK_TILE_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const SEAMARK_ATTRIBUTION =
  'Marine data &copy; <a href="https://www.openseamap.org">OpenSeaMap</a>';

/**
 * Custom blue-dot icon for the current user's position.
 */
const myPositionIcon = L.divIcon({
  className: 'wake-my-position',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span class="wake-my-position-pulse"></span><span class="wake-my-position-dot"></span>',
});

/**
 * Recenter the map on the first geolocation fix only — subsequent fixes
 * just move the marker so we don't yank the view away from the user.
 */
function FlyToFirstFix({ position, hasCentered, onCentered }) {
  const map = useMap();
  useEffect(() => {
    if (!position || hasCentered) return;
    map.setView([position.lat, position.lng], 14);
    onCentered();
  }, [position, hasCentered, onCentered, map]);
  return null;
}

/**
 * @param {Object} props
 * @param {[number, number]} [props.initialCenter]
 * @param {number} [props.initialZoom]
 */
function MapView({ initialCenter = DEFAULT_CENTER, initialZoom = DEFAULT_ZOOM }) {
  const [position, setPosition] = useState(null); // { lat, lng, accuracy }
  const [error, setError] = useState(null);
  const [hasCentered, setHasCentered] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available in this browser.');
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        logger.warn(`Geolocation error: ${err.message}`);
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="map-view">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="map-canvas"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Seamarks (OpenSeaMap)">
            <TileLayer
              url={SEAMARK_TILE_URL}
              attribution={SEAMARK_ATTRIBUTION}
              maxZoom={18}
              opacity={0.85}
            />
          </LayersControl.Overlay>
        </LayersControl>

        {position && (
          <>
            <Circle
              center={[position.lat, position.lng]}
              radius={position.accuracy}
              pathOptions={{
                color: '#2196f3',
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
            <Marker
              position={[position.lat, position.lng]}
              icon={myPositionIcon}
              keyboard={false}
              interactive={false}
            />
          </>
        )}

        <FlyToFirstFix
          position={position}
          hasCentered={hasCentered}
          onCentered={() => setHasCentered(true)}
        />
      </MapContainer>

      {error && (
        <div className="map-banner map-banner--warn" role="status">
          Location unavailable: {error}. The map still works — just no blue dot.
        </div>
      )}
    </div>
  );
}

export default MapView;
