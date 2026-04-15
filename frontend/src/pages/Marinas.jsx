/**
 * Marinas admin page.
 *
 * @fileoverview Admin-only catalogue editor for marinas. List + add/edit/delete.
 * Coordinates can be picked by clicking the embedded mini-map (added in a
 * later iteration) or typed manually for now.
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
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useToast, useDialog } from '../App';
import AddIcon from '../assets/icons/add.svg?react';
import EditIcon from '../assets/icons/edit.svg?react';
import DeleteIcon from '../assets/icons/delete.svg?react';
import MarinaIcon from '../assets/icons/marina.svg?react';

const EMPTY_FORM = { name: '', lat: '', lng: '', notes: '' };

function MarinasInner() {
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(true);
  const [marinas, setMarinas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    try {
      setMarinas(await api.listMarinas());
    } catch (err) {
      logger.error('Failed to list marinas:', err.message);
      showToast('Could not load marinas', 'error');
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditing('new');
    setForm(EMPTY_FORM);
  }

  function startEdit(m) {
    setEditing(m.id);
    setForm({
      name: m.name,
      lat: String(m.lat ?? ''),
      lng: String(m.lng ?? ''),
      notes: m.notes || '',
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function save(e) {
    e.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      showToast('Latitude and longitude must be numbers', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), lat, lng, notes: form.notes.trim() || null };
      if (editing === 'new') {
        await api.createMarina(payload);
        showToast('Marina added', 'success');
      } else {
        await api.updateMarina(editing, payload);
        showToast('Marina updated', 'success');
      }
      cancelEdit();
      await reload();
    } catch (err) {
      logger.error('Marina save failed:', err.message);
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(m) {
    const ok = await showDialog({
      title: 'Delete marina?',
      message: `${m.name} will be removed. Boaters who chose it as their home marina will have their selection cleared.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteMarina(m.id);
      showToast('Marina deleted', 'success');
      await reload();
    } catch (err) {
      logger.error('Marina delete failed:', err.message);
      showToast('Delete failed', 'error');
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header--with-action">
        <div>
          <h1>Marinas</h1>
          <p className="page-subtitle">Add or edit the marinas that boaters can pick as home.</p>
        </div>
        <button className="btn btn-primary" onClick={startCreate} disabled={editing === 'new'}>
          <AddIcon /> Add marina
        </button>
      </header>

      {editing && (
        <form className="card" onSubmit={save}>
          <h2 className="card-title">{editing === 'new' ? 'New marina' : 'Edit marina'}</h2>
          <FormField
            label="Name"
            required
            inputProps={{
              value: form.name,
              onChange: (e) => setForm({ ...form, name: e.target.value }),
              maxLength: 120,
            }}
          />
          <div className="form-grid form-grid--2">
            <FormField
              label="Latitude"
              help="Decimal degrees, e.g. 44.330"
              required
              inputProps={{
                value: form.lat,
                onChange: (e) => setForm({ ...form, lat: e.target.value }),
                inputMode: 'decimal',
              }}
            />
            <FormField
              label="Longitude"
              help="Decimal degrees, negative west, e.g. -76.164"
              required
              inputProps={{
                value: form.lng,
                onChange: (e) => setForm({ ...form, lng: e.target.value }),
                inputMode: 'decimal',
              }}
            />
          </div>
          <FormField
            label="Notes"
            as="textarea"
            inputProps={{
              value: form.notes,
              onChange: (e) => setForm({ ...form, notes: e.target.value }),
              rows: 3,
            }}
          />
          <div className="form-row form-row--end">
            <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : marinas.length === 0 ? (
        <EmptyState
          illustration={<MarinaIcon />}
          title="No marinas yet"
          description="Add the marinas your boating community uses."
        />
      ) : (
        <ul className="data-list">
          {marinas.map((m) => (
            <li key={m.id} className="data-list-item">
              <div className="data-list-icon"><MarinaIcon /></div>
              <div className="data-list-body">
                <div className="data-list-title">{m.name}</div>
                <div className="data-list-meta">
                  {m.lat?.toFixed(4)}, {m.lng?.toFixed(4)}
                  {m.notes ? ` · ${m.notes}` : ''}
                </div>
              </div>
              <div className="data-list-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(m)} aria-label={`Edit ${m.name}`}>
                  <EditIcon />
                </button>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(m)} aria-label={`Delete ${m.name}`}>
                  <DeleteIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Marinas() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="not-found">
        <p className="not-found-code">403</p>
        <h1 className="not-found-title">Forbidden</h1>
        <p className="not-found-message">
          Only administrators can manage the marina catalogue.
        </p>
      </div>
    );
  }
  return <MarinasInner />;
}

export default Marinas;
