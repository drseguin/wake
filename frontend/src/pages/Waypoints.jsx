/**
 * Waypoints list page.
 *
 * @fileoverview Lists every waypoint visible to the user — own + shared
 * by crews. Owner can edit (opens WaypointDialog) and delete here. New
 * waypoints are added by right-clicking the map; this page is read/edit.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import EmptyState from '../components/EmptyState';
import WaypointDialog from '../components/WaypointDialog';
import { useToast, useDialog } from '../App';
import { useAuth } from '../contexts/AuthContext';
import WaypointIcon from '../assets/icons/waypoint.svg?react';
import EditIcon from '../assets/icons/edit.svg?react';
import DeleteIcon from '../assets/icons/delete.svg?react';

function Waypoints() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(true);
  const [waypoints, setWaypoints] = useState([]);
  const [crews, setCrews] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    try {
      const [wps, cs] = await Promise.all([api.listWaypoints(), api.listCrews()]);
      setWaypoints(wps);
      setCrews(cs);
    } catch (err) {
      logger.error('Failed to load waypoints:', err.message);
      showToast('Could not load waypoints', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function remove(w) {
    const ok = await showDialog({
      title: 'Delete waypoint?',
      message: `${w.name} will be removed for everyone.`,
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteWaypoint(w.id);
      showToast('Waypoint deleted', 'success');
      reload();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  }

  async function save(payload) {
    try {
      await api.updateWaypoint(editing.id, payload);
      showToast('Waypoint updated', 'success');
      setEditing(null);
      reload();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Waypoints</h1>
        <p className="page-subtitle">
          Right-click the map to add a new waypoint. Sharing happens per-crew.
        </p>
      </header>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : waypoints.length === 0 ? (
        <EmptyState
          illustration={<WaypointIcon />}
          title="No waypoints yet"
          description="Drop one by right-clicking the map. Optionally share it with one of your crews."
        />
      ) : (
        <ul className="data-list">
          {waypoints.map((w) => {
            const mine = w.owner_username === user?.username;
            return (
              <li key={w.id} className="data-list-item">
                <div className={`data-list-icon icon-pick-swatch icon-pick-swatch--${w.icon}`}>
                  <WaypointIcon />
                </div>
                <div className="data-list-body">
                  <div className="data-list-title">{w.name}</div>
                  <div className="data-list-meta">
                    {w.icon} · {w.lat.toFixed(4)}, {w.lng.toFixed(4)}
                    {!mine && ` · shared by ${w.owner_username}`}
                    {w.crew_ids?.length > 0 && ` · ${w.crew_ids.length} crew${w.crew_ids.length === 1 ? '' : 's'}`}
                  </div>
                </div>
                {mine && (
                  <div className="data-list-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(w)} aria-label={`Edit ${w.name}`}>
                      <EditIcon />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(w)} aria-label={`Delete ${w.name}`}>
                      <DeleteIcon />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <WaypointDialog
          mode="edit" waypoint={editing} crews={crews}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

export default Waypoints;
