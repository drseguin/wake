/**
 * MapView — Leaflet wrapper for WAKE's marine dashboard.
 *
 * @fileoverview Renders OSM + Esri Ocean bathymetry base layers, OpenSeaMap
 * seamarks, NOAA charts (US), and depth-label overlays; plus the user's own
 * position via locationService, all visible waypoints (own + crew-shared),
 * and crew members who are broadcasting their position.
 *
 * Right-click (or long-press) on the map to drop a new waypoint. Clicking
 * a waypoint marker opens a popup with edit / delete actions if owned.
 * Use the Recenter button to fly back to your current GPS fix.
 *
 * @author David Seguin
 * @version 2.1.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, LayersControl, Marker, Circle, Popup, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import api from '../services/api';
import locationService from '../services/locationService';
import logger from '../utils/logger';
import { waypointDivIcon, crewBoatDivIcon } from '../utils/mapIcons';
import WaypointDialog from './WaypointDialog';
import ShareLocationDialog from './ShareLocationDialog';
import { useToast, useDialog } from '../App';
import { useAuth } from '../contexts/AuthContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const DEFAULT_CENTER = [44.34, -76.16]; // Gananoque, ON
const DEFAULT_ZOOM = 12;

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SEAMARK_TILE_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const SEAMARK_ATTRIBUTION = 'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a>';
const NOAA_TILE_URL = 'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png';
const NOAA_ATTRIBUTION = 'Charts &copy; <a href="https://www.charts.noaa.gov">NOAA</a> (US waters)';
// Esri's World Ocean Base is a raster tile service with global bathymetry
// shading and sounding labels (sources: GEBCO, NOAA, CHS, and others).
// Unlike OpenSeaMap's near-empty crowdsourced depth tiles, this actually
// shows depth everywhere — including Canadian inland waters.
const ESRI_OCEAN_BASE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_OCEAN_REF_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_OCEAN_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> — Sources: GEBCO, NOAA, CHS, and others';

const CREW_REFRESH_MS = 30_000;
const STALE_MS = 10 * 60 * 1000;
const HIDE_MS = 60 * 60 * 1000;

const myPositionIcon = L.divIcon({
  className: 'wake-my-position',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span class="wake-my-position-pulse"></span><span class="wake-my-position-dot"></span>',
});

function FlyToFirstFix({ position, hasCentered, onCentered }) {
  const map = useMap();
  useEffect(() => {
    if (!position || hasCentered) return;
    map.setView([position.lat, position.lng], 14);
    onCentered();
  }, [position, hasCentered, onCentered, map]);
  return null;
}

function MapEvents({ onContextMenu }) {
  useMapEvents({
    contextmenu: (e) => onContextMenu(e.latlng),
  });
  return null;
}

function MapView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();

  const [position, setPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [shareState, setShareState] = useState({
    enabled: false, audience_mode: 'all', audience_crew_ids: [],
    duration_mode: 'indefinite', expires_at: null,
  });
  const [waypoints, setWaypoints] = useState([]);
  const [crewLocs, setCrewLocs] = useState([]);
  const [crews, setCrews] = useState([]);
  const [homeMarinaId, setHomeMarinaId] = useState(null);
  const [dialogState, setDialogState] = useState(null); // null | { mode, waypoint?, lat?, lng? }
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const mapRef = useRef(null);

  const sharing = shareState.enabled;

  // Subscribe to position + sharing state.
  useEffect(() => {
    locationService.start();
    locationService.hydrateSharing();
    const unsubPos = locationService.subscribePosition((p, err) => {
      setPosition(p);
      if (err) setGeoError(err); else setGeoError(null);
    });
    const unsubShare = locationService.subscribeShare(setShareState);
    return () => { unsubPos(); unsubShare(); };
  }, []);

  const reloadWaypoints = useCallback(async () => {
    try {
      setWaypoints(await api.listWaypoints());
    } catch (err) {
      logger.warn(`Could not load waypoints: ${err.message}`);
    }
  }, []);

  const reloadCrewLocs = useCallback(async () => {
    try {
      setCrewLocs(await api.getCrewLocations());
    } catch (err) {
      logger.debug(`Could not load crew locations: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    reloadWaypoints();
    reloadCrewLocs();
    api.listCrews().then(setCrews).catch(() => {});
    api.getProfile()
      .then((p) => setHomeMarinaId(p?.home_marina_id ?? null))
      .catch(() => {});
    const id = setInterval(reloadCrewLocs, CREW_REFRESH_MS);
    return () => clearInterval(id);
  }, [reloadWaypoints, reloadCrewLocs]);

  // ---- handlers ----

  async function submitShare(payload) {
    try {
      await locationService.updateSharing(payload);
      showToast(
        payload.enabled ? 'Sharing your position' : 'Sharing off',
        'info',
      );
      setShareDialogOpen(false);
    } catch (err) {
      if (err.status === 400) {
        // Most common case: server says set a home marina first. Surface
        // the dialog's inline "no home marina" screen by flipping local
        // state so the dialog re-renders in that mode.
        setHomeMarinaId(null);
        throw new Error('Set your home marina in your Profile before sharing.');
      }
      throw err;
    }
  }

  async function stopSharing() {
    try {
      await locationService.updateSharing({ enabled: false });
      showToast('Sharing off', 'info');
      setShareDialogOpen(false);
    } catch (err) {
      showToast('Could not stop sharing', 'error');
    }
  }

  function onContextMenu(latlng) {
    setDialogState({ mode: 'create', lat: latlng.lat, lng: latlng.lng });
  }

  function recenterOnMe() {
    if (!mapRef.current) return;
    if (!position) {
      showToast(geoError
        ? `Location unavailable: ${geoError}`
        : 'Waiting for a GPS fix…', 'info');
      return;
    }
    mapRef.current.flyTo([position.lat, position.lng], 14, { duration: 0.8 });
  }

  async function onSaveWaypoint(payload) {
    try {
      if (dialogState?.mode === 'edit') {
        await api.updateWaypoint(dialogState.waypoint.id, payload);
        showToast('Waypoint updated', 'success');
      } else {
        await api.createWaypoint(payload);
        showToast('Waypoint added', 'success');
      }
      setDialogState(null);
      await reloadWaypoints();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  }

  async function onDeleteWaypoint(w) {
    const ok = await showDialog({
      title: 'Delete waypoint?',
      message: `${w.name} will be removed for everyone you've shared it with.`,
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteWaypoint(w.id);
      showToast('Waypoint deleted', 'success');
      await reloadWaypoints();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  }

  // ---- render helpers ----

  const visibleCrewLocs = useMemo(() => {
    const now = Date.now();
    return crewLocs.filter((c) => {
      if (!c.updated_at) return false;
      const age = now - new Date(c.updated_at).getTime();
      return age < HIDE_MS;
    }).map((c) => {
      const age = now - new Date(c.updated_at).getTime();
      return { ...c, _stale: age > STALE_MS };
    });
  }, [crewLocs]);

  return (
    <div className="map-view">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="map-canvas"
        ref={mapRef}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="Ocean (depth shading)">
            <TileLayer url={ESRI_OCEAN_BASE_URL} attribution={ESRI_OCEAN_ATTRIBUTION}
                       maxZoom={19} maxNativeZoom={13} />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Depth labels (soundings, places)">
            <TileLayer url={ESRI_OCEAN_REF_URL} attribution={ESRI_OCEAN_ATTRIBUTION}
                       maxZoom={19} maxNativeZoom={13} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Seamarks (buoys, lights, marinas)">
            <TileLayer url={SEAMARK_TILE_URL} attribution={SEAMARK_ATTRIBUTION} maxZoom={18} opacity={0.9} />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="NOAA Charts (US waters, with depth)">
            <TileLayer url={NOAA_TILE_URL} attribution={NOAA_ATTRIBUTION} maxZoom={18} opacity={0.85} />
          </LayersControl.Overlay>
        </LayersControl>

        <MapEvents onContextMenu={onContextMenu} />
        <FlyToFirstFix
          position={position}
          hasCentered={hasCentered}
          onCentered={() => setHasCentered(true)}
        />

        {position && (
          <>
            <Circle center={[position.lat, position.lng]} radius={position.accuracy}
                    pathOptions={{ color: '#2196f3', fillOpacity: 0.08, weight: 1 }} />
            <Marker position={[position.lat, position.lng]} icon={myPositionIcon}
                    keyboard={false} interactive={false} />
          </>
        )}

        {waypoints.map((w) => (
          <Marker key={w.id} position={[w.lat, w.lng]} icon={waypointDivIcon(w.icon)}>
            <Popup>
              <div className="map-popup">
                <strong>{w.name}</strong>
                {w.description && <p>{w.description}</p>}
                <div className="map-popup-meta">
                  {w.icon} · {w.lat.toFixed(4)}, {w.lng.toFixed(4)}
                </div>
                {w.owner_username === user?.username ? (
                  <div className="map-popup-actions">
                    <button className="btn btn-sm btn-secondary"
                            onClick={() => setDialogState({ mode: 'edit', waypoint: w })}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger"
                            onClick={() => onDeleteWaypoint(w)}>
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="map-popup-meta">Shared by {w.owner_username}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {visibleCrewLocs.map((c) => (
          <Marker key={c.username}
                  position={[c.lat, c.lng]}
                  icon={crewBoatDivIcon(c.display, c.heading_deg)}
                  opacity={c._stale ? 0.45 : 1}>
            <Popup>
              <div className="map-popup">
                <strong>{c.display}</strong>
                {c.boat_name && <div className="map-popup-meta">{c.boat_name}</div>}
                <div className="map-popup-meta">
                  {c._stale ? 'Last seen ' : 'Updated '}
                  {new Date(c.updated_at).toLocaleTimeString()}
                  {c.speed_kts != null ? ` · ${c.speed_kts.toFixed(1)} kts` : ''}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-controls">
        <button className={`btn ${sharing ? 'btn-primary' : 'btn-secondary'} map-share-btn`}
                onClick={() => setShareDialogOpen(true)}
                title={sharing ? 'Change audience or stop sharing' : 'Share your position'}>
          {sharing ? `● Sharing (${audienceLabel(shareState)})` : 'Share my position'}
        </button>
        <button className="btn btn-secondary map-share-btn"
                onClick={recenterOnMe}
                disabled={!position}
                title={position ? 'Center map on my location' : 'Waiting for GPS fix'}>
          Recenter
        </button>
      </div>

      <div className="map-hint">Right-click the map to drop a waypoint.</div>

      {geoError && (
        <div className="map-banner map-banner--warn" role="status">
          Location unavailable: {geoError}. The map still works — just no blue dot.
        </div>
      )}

      {dialogState && (
        <WaypointDialog
          mode={dialogState.mode}
          waypoint={dialogState.waypoint}
          lat={dialogState.lat}
          lng={dialogState.lng}
          crews={crews}
          onClose={() => setDialogState(null)}
          onSave={onSaveWaypoint}
        />
      )}

      {shareDialogOpen && (
        <ShareLocationDialog
          currentState={shareState}
          crews={crews}
          hasHomeMarina={homeMarinaId != null}
          isSharing={sharing}
          onClose={() => setShareDialogOpen(false)}
          onSubmit={submitShare}
          onStop={stopSharing}
        />
      )}
    </div>
  );
}

function audienceLabel(s) {
  if (s.audience_mode === 'marina') return 'marina';
  if (s.audience_mode === 'crews') {
    const n = (s.audience_crew_ids || []).length;
    return n === 1 ? '1 crew' : `${n} crews`;
  }
  return 'all crews';
}

export default MapView;
