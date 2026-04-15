/**
 * Profile page — boater profile editor.
 *
 * @fileoverview Lets the signed-in user pick a display handle (real name vs
 * boat name), record boat details, and choose a home marina from the
 * admin-managed catalogue. The profile row is created lazily on first
 * fetch by the backend, so this page never shows an empty/null state.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import FormField from '../components/FormField';
import { useToast } from '../App';

const BOAT_TYPES = [
  { value: '',         label: '— Select boat type —' },
  { value: 'power',    label: 'Power' },
  { value: 'sail',     label: 'Sail' },
  { value: 'pontoon',  label: 'Pontoon' },
  { value: 'paddle',   label: 'Kayak / Canoe / SUP' },
  { value: 'seadoo',   label: 'Seadoo / PWC' },
  { value: 'other',    label: 'Other' },
];

function Profile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marinas, setMarinas] = useState([]);
  const [form, setForm] = useState({
    display_name: '',
    handle_type: 'name',
    boat_name: '',
    boat_type: '',
    home_marina_id: '',
  });
  const [effectiveHandle, setEffectiveHandle] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profile, marinaList] = await Promise.all([
          api.getProfile(),
          api.listMarinas(),
        ]);
        setForm({
          display_name: profile.display_name || '',
          handle_type: profile.handle_type || 'name',
          boat_name: profile.boat_name || '',
          boat_type: profile.boat_type || '',
          home_marina_id: profile.home_marina_id == null ? '' : String(profile.home_marina_id),
        });
        setEffectiveHandle(profile.effective_handle || '');
        setMarinas(marinaList);
      } catch (err) {
        logger.error('Failed to load profile:', err.message);
        showToast('Could not load profile', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = {
        display_name: form.display_name.trim(),
        handle_type: form.handle_type,
        boat_name: form.boat_name.trim(),
        boat_type: form.boat_type || null,
        home_marina_id: form.home_marina_id === '' ? null : Number(form.home_marina_id),
      };
      const updated = await api.saveProfile(patch);
      setEffectiveHandle(updated.effective_handle || '');
      showToast('Profile saved', 'success');
    } catch (err) {
      logger.error('Profile save failed:', err.message);
      showToast('Save failed — check your inputs', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page page-narrow">
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <h1>Profile</h1>
        <p className="page-subtitle">
          How other boaters in your crews see you on the map.
        </p>
      </header>

      <form className="card" onSubmit={save}>
        <FormField
          label="Display name"
          help="Your name (or whatever you'd like other boaters to call you)."
          required
          inputProps={{
            value: form.display_name,
            onChange: (e) => update('display_name', e.target.value),
            maxLength: 120,
          }}
        />

        <FormField
          label="Boat name"
          help="Optional — required if you choose to be known by your boat's name."
          inputProps={{
            value: form.boat_name,
            onChange: (e) => update('boat_name', e.target.value),
            maxLength: 120,
            placeholder: 'e.g. Reel Time',
          }}
        />

        <FormField
          label="Show me as"
          as="select"
          inputProps={{
            value: form.handle_type,
            onChange: (e) => update('handle_type', e.target.value),
          }}
        >
          <option value="name">My display name</option>
          <option value="boat">My boat name</option>
        </FormField>

        <FormField
          label="Boat type"
          as="select"
          inputProps={{
            value: form.boat_type,
            onChange: (e) => update('boat_type', e.target.value),
          }}
        >
          {BOAT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </FormField>

        <FormField
          label="Home marina"
          as="select"
          help="Pick from the marinas your admin has set up."
          inputProps={{
            value: form.home_marina_id,
            onChange: (e) => update('home_marina_id', e.target.value),
          }}
        >
          <option value="">— Not specified —</option>
          {marinas.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </FormField>

        <div className="form-row form-row--end">
          <span className="form-row-meta">
            On the map you'll appear as <strong>{effectiveHandle || '—'}</strong>
          </span>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
