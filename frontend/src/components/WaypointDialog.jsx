/**
 * WaypointDialog — modal for adding or editing a waypoint.
 *
 * @fileoverview Captures name, description, icon kind, and the set of
 * crews to share the waypoint with. Coordinates come from the map click
 * (create) or the existing waypoint (edit) and are not user-editable here.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import FormField from './FormField';
import { ICON_KINDS } from '../utils/mapIcons';
import CloseIcon from '../assets/icons/close.svg?react';

const ICON_LABELS = {
  anchor:  'Anchorage',
  fuel:    'Fuel',
  fishing: 'Fishing',
  hazard:  'Hazard',
  marina:  'Marina',
  other:   'Other',
};

function WaypointDialog({ mode, waypoint, lat, lng, crews = [], onClose, onSave }) {
  const isEdit = mode === 'edit';
  const initialLat = isEdit ? waypoint.lat : lat;
  const initialLng = isEdit ? waypoint.lng : lng;

  const [name, setName] = useState(isEdit ? waypoint.name : '');
  const [description, setDescription] = useState(isEdit ? (waypoint.description || '') : '');
  const [icon, setIcon] = useState(isEdit ? waypoint.icon : 'anchor');
  const [crewIds, setCrewIds] = useState(() => new Set(isEdit ? waypoint.crew_ids : []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  function toggleCrew(id) {
    setCrewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        lat: initialLat,
        lng: initialLng,
        icon,
        crew_ids: Array.from(crewIds),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit waypoint' : 'New waypoint'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={submit} className="modal-body">
          <FormField
            label="Name" required
            inputProps={{
              value: name,
              onChange: (e) => setName(e.target.value),
              maxLength: 120,
              autoFocus: true,
              placeholder: 'e.g. Anchorage in Endymion Cove',
            }}
          />
          <FormField
            label="Description" as="textarea"
            inputProps={{
              value: description,
              onChange: (e) => setDescription(e.target.value),
              rows: 3,
              placeholder: 'Notes for yourself or your crew',
            }}
          />

          <div className="form-field">
            <span className="form-field-label">Icon</span>
            <div className="icon-picker">
              {ICON_KINDS.map((k) => (
                <button
                  key={k} type="button"
                  className={`icon-pick ${icon === k ? 'icon-pick--active' : ''}`}
                  onClick={() => setIcon(k)}
                >
                  <span className={`icon-pick-swatch icon-pick-swatch--${k}`} />
                  <span>{ICON_LABELS[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <span className="form-field-label">Share with crews</span>
            {crews.length === 0 ? (
              <div className="form-field-help">You're not in any crews yet — this waypoint will stay private.</div>
            ) : (
              <div className="checkbox-list">
                {crews.map((c) => (
                  <label key={c.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={crewIds.has(c.id)}
                      onChange={() => toggleCrew(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="form-field-help">
              Unchecked crews won't see this waypoint. Check none to keep it private.
            </div>
          </div>

          <div className="form-row form-row--end">
            <span className="form-row-meta">
              {initialLat?.toFixed(5)}, {initialLng?.toFixed(5)}
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add waypoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WaypointDialog;
