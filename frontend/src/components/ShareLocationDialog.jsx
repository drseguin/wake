/**
 * ShareLocationDialog — picks audience + duration for live location sharing.
 *
 * @fileoverview Opens when the user hits "Share my position" on the map.
 * Captures:
 *   - Audience: Everyone / Specific crews / My marina
 *   - Duration: Indefinite / For N hours / Until I move
 * Submits via locationService.updateSharing. Also surfaces the "no home
 * marina" blocker with a link back to the Profile page.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CloseIcon from '../assets/icons/close.svg?react';

const HOUR_PRESETS = [1, 4, 8, 24];

function ShareLocationDialog({
  currentState,
  crews,
  hasHomeMarina,
  isSharing,
  onClose,
  onSubmit,
  onStop,
}) {
  const [audienceMode, setAudienceMode] = useState(currentState.audience_mode || 'all');
  const [crewIds, setCrewIds] = useState(
    () => new Set(currentState.audience_crew_ids || [])
  );
  const [durationMode, setDurationMode] = useState(currentState.duration_mode || 'indefinite');
  const [hours, setHours] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
    setError(null);

    if (audienceMode === 'crews' && crewIds.size === 0) {
      setError('Pick at least one crew to share with.');
      return;
    }
    if (durationMode === 'hours' && (!hours || hours <= 0)) {
      setError('Enter a positive number of hours.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        enabled: true,
        audience_mode: audienceMode,
        audience_crew_ids: Array.from(crewIds),
        duration_mode: durationMode,
        duration_hours: durationMode === 'hours' ? hours : undefined,
      });
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function stop() {
    setSaving(true);
    try { await onStop(); } finally { setSaving(false); }
  }

  if (!hasHomeMarina) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Set a home marina first</h2>
            <button className="btn-icon" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          </div>
          <div className="modal-body">
            <p>
              Location sharing is scoped to your home marina (for marina-wide
              sharing) and to your crews. Pick your marina on your profile,
              then come back to share.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <Link to="/profile" className="btn btn-primary" onClick={onClose}>
              Open profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isSharing ? 'Update sharing' : 'Share my position'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={submit} className="modal-body">
          <div className="form-field">
            <span className="form-field-label">Who can see me?</span>
            <label className="radio-row">
              <input type="radio" name="audience" value="all"
                     checked={audienceMode === 'all'}
                     onChange={() => setAudienceMode('all')} />
              <span>Everyone in my crews</span>
            </label>
            <label className="radio-row">
              <input type="radio" name="audience" value="crews"
                     checked={audienceMode === 'crews'}
                     onChange={() => setAudienceMode('crews')} />
              <span>Specific crews…</span>
            </label>
            <label className="radio-row">
              <input type="radio" name="audience" value="marina"
                     checked={audienceMode === 'marina'}
                     onChange={() => setAudienceMode('marina')} />
              <span>Everyone at my home marina</span>
            </label>

            {audienceMode === 'crews' && (
              crews.length === 0 ? (
                <div className="form-field-help">
                  You're not in any crews yet.
                </div>
              ) : (
                <div className="checkbox-list checkbox-list--indent">
                  {crews.map((c) => (
                    <label key={c.id} className="checkbox-row">
                      <input type="checkbox"
                             checked={crewIds.has(c.id)}
                             onChange={() => toggleCrew(c.id)} />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="form-field">
            <span className="form-field-label">For how long?</span>
            <label className="radio-row">
              <input type="radio" name="duration" value="indefinite"
                     checked={durationMode === 'indefinite'}
                     onChange={() => setDurationMode('indefinite')} />
              <span>Until I turn it off</span>
            </label>
            <label className="radio-row">
              <input type="radio" name="duration" value="hours"
                     checked={durationMode === 'hours'}
                     onChange={() => setDurationMode('hours')} />
              <span>For a fixed time…</span>
            </label>
            <label className="radio-row">
              <input type="radio" name="duration" value="until_move"
                     checked={durationMode === 'until_move'}
                     onChange={() => setDurationMode('until_move')} />
              <span>Until I leave this spot</span>
            </label>

            {durationMode === 'hours' && (
              <div className="duration-hours">
                <div className="duration-hours__presets">
                  {HOUR_PRESETS.map((h) => (
                    <button key={h} type="button"
                            className={`btn btn-sm ${hours === h ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setHours(h)}>
                      {h === 1 ? '1 hour' : `${h} hours`}
                    </button>
                  ))}
                </div>
                <label className="duration-hours__custom">
                  <span>Custom:</span>
                  <input type="number" min="0.5" step="0.5" max="336"
                         value={hours}
                         onChange={(e) => setHours(Number(e.target.value))} />
                  <span>hours</span>
                </label>
              </div>
            )}
          </div>

          {error && <div className="form-field-error">{error}</div>}
        </form>

        <div className="modal-footer">
          {isSharing && (
            <button type="button" className="btn btn-danger" onClick={stop} disabled={saving}>
              Stop sharing
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : (isSharing ? 'Update' : 'Start sharing')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareLocationDialog;
