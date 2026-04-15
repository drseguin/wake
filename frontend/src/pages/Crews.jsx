/**
 * Crews — list of my crews + pending invitations + create form.
 *
 * @fileoverview Landing page for the social side of WAKE. Shows crews
 * I'm in (click to open the detail page), pending invitations I can
 * accept or decline, and a button to start a new crew.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import logger from '../utils/logger';
import EmptyState from '../components/EmptyState';
import FormField from '../components/FormField';
import { useToast } from '../App';
import GroupIcon from '../assets/icons/group.svg?react';
import AddIcon from '../assets/icons/add.svg?react';

function Crews() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [crews, setCrews] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    try {
      const [c, inv] = await Promise.all([api.listCrews(), api.listInvitations()]);
      setCrews(c);
      setInvitations(inv);
    } catch (err) {
      logger.error('Failed to load crews:', err.message);
      showToast('Could not load crews', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const c = await api.createCrew({ name: newName.trim(), description: newDesc.trim() || null });
      showToast('Crew created', 'success');
      setShowCreate(false);
      setNewName(''); setNewDesc('');
      navigate(`/crews/${c.id}`);
    } catch (err) {
      showToast(`Create failed: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function accept(inv) {
    try {
      await api.acceptInvitation(inv.id);
      showToast(`Joined ${inv.crew_name}`, 'success');
      reload();
    } catch (err) {
      showToast('Accept failed', 'error');
    }
  }

  async function decline(inv) {
    try {
      await api.declineInvitation(inv.id);
      showToast('Invitation declined', 'info');
      reload();
    } catch (err) {
      showToast('Decline failed', 'error');
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header--with-action">
        <div>
          <h1>Crews</h1>
          <p className="page-subtitle">Your boating groups — share location, waypoints, and chat.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <AddIcon /> New crew
        </button>
      </header>

      {showCreate && (
        <form className="card" onSubmit={create}>
          <h2 className="card-title">Start a new crew</h2>
          <FormField
            label="Crew name" required
            inputProps={{
              value: newName,
              onChange: (e) => setNewName(e.target.value),
              maxLength: 80,
              placeholder: 'e.g. Pecks Wednesday Night Crew',
              autoFocus: true,
            }}
          />
          <FormField
            label="Description" as="textarea"
            inputProps={{
              value: newDesc,
              onChange: (e) => setNewDesc(e.target.value),
              rows: 2,
              placeholder: 'What you have in common (optional)',
            }}
          />
          <div className="form-row form-row--end">
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {invitations.length > 0 && (
        <section className="card">
          <h2 className="card-title">Pending invitations</h2>
          <ul className="data-list">
            {invitations.map((inv) => (
              <li key={inv.id} className="data-list-item">
                <div className="data-list-icon"><GroupIcon /></div>
                <div className="data-list-body">
                  <div className="data-list-title">{inv.crew_name}</div>
                  <div className="data-list-meta">Invited by {inv.invited_by_display}</div>
                </div>
                <div className="data-list-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => decline(inv)}>Decline</button>
                  <button className="btn btn-primary btn-sm" onClick={() => accept(inv)}>Accept</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : crews.length === 0 ? (
        <EmptyState
          illustration={<GroupIcon />}
          title="No crews yet"
          description="Create one to start sharing your position and chatting with friends on the water."
        />
      ) : (
        <ul className="data-list">
          {crews.map((c) => (
            <li key={c.id} className="data-list-item">
              <div className="data-list-icon"><GroupIcon /></div>
              <div className="data-list-body">
                <Link to={`/crews/${c.id}`} className="data-list-title">{c.name}</Link>
                <div className="data-list-meta">
                  {c.member_count} member{c.member_count === 1 ? '' : 's'}
                  {c.description ? ` · ${c.description}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Crews;
