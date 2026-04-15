/**
 * CrewDetail — members, invite typeahead, chat board, and crew actions.
 *
 * @fileoverview Owner can invite new members and delete the crew. Any
 * member can leave or post messages. The invite typeahead searches the
 * users API for matching display or boat names.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import logger from '../utils/logger';
import CrewChat from '../components/CrewChat';
import { useToast, useDialog } from '../App';
import { useAuth } from '../contexts/AuthContext';
import GroupIcon from '../assets/icons/group.svg?react';
import DeleteIcon from '../assets/icons/delete.svg?react';
import LogoutIcon from '../assets/icons/logout.svg?react';

function CrewDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [crew, setCrew] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { reload(); }, [id]);

  async function reload() {
    setLoading(true);
    try {
      setCrew(await api.getCrew(id));
    } catch (err) {
      logger.error('Failed to load crew:', err.message);
      showToast('Could not load crew', 'error');
      navigate('/crews');
    } finally {
      setLoading(false);
    }
  }

  // Debounced search.
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return undefined; }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const list = await api.searchUsers(search.trim());
        const memberSet = new Set((crew?.members || []).map((m) => m.username));
        setResults(list.filter((u) => !memberSet.has(u.username)));
      } catch (err) {
        logger.warn(`Search failed: ${err.message}`);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [search, crew]);

  async function invite(u) {
    try {
      await api.inviteToCrew(id, u.username);
      showToast(`Invitation sent to ${u.display}`, 'success');
      setSearch(''); setResults([]);
    } catch (err) {
      showToast(err.status === 409 ? 'Already invited or already a member' : 'Invite failed', 'error');
    }
  }

  async function removeMember(m) {
    const ok = await showDialog({
      title: `Remove ${m.display}?`,
      message: 'They will lose access to this crew\'s shared waypoints, location, and chat.',
      confirmText: 'Remove', danger: true,
    });
    if (!ok) return;
    try {
      await api.removeCrewMember(id, m.username);
      showToast('Member removed', 'success');
      reload();
    } catch (err) {
      showToast('Remove failed', 'error');
    }
  }

  async function leave() {
    const ok = await showDialog({
      title: 'Leave this crew?',
      message: 'You\'ll stop seeing their location and shared waypoints.',
      confirmText: 'Leave', danger: true,
    });
    if (!ok) return;
    try {
      await api.removeCrewMember(id, user.username);
      showToast('You left the crew', 'info');
      navigate('/crews');
    } catch (err) {
      showToast(err.status === 400
        ? 'You\'re the owner — delete the crew instead.'
        : 'Leave failed', 'error');
    }
  }

  async function destroy() {
    const ok = await showDialog({
      title: 'Delete this crew?',
      message: 'All members lose access and chat history is gone. This cannot be undone.',
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteCrew(id);
      showToast('Crew deleted', 'info');
      navigate('/crews');
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  }

  if (loading || !crew) {
    return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>;
  }

  const meIsOwner = crew.members.some((m) => m.username === user?.username && m.role === 'owner');

  return (
    <div className="page">
      <header className="page-header page-header--with-action">
        <div>
          <h1>{crew.name}</h1>
          <p className="page-subtitle">
            {crew.description || 'No description'} · {crew.member_count} member{crew.member_count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="data-list-actions">
          {meIsOwner ? (
            <button className="btn btn-ghost btn-danger" onClick={destroy}>
              <DeleteIcon /> Delete crew
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={leave}>
              <LogoutIcon /> Leave crew
            </button>
          )}
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">Members</h2>
        <ul className="data-list">
          {crew.members.map((m) => (
            <li key={m.username} className="data-list-item">
              <div className="data-list-icon"><GroupIcon /></div>
              <div className="data-list-body">
                <div className="data-list-title">
                  {m.display}{m.role === 'owner' && <span className="badge"> Owner</span>}
                </div>
                <div className="data-list-meta">
                  {m.boat_name ? `Boat: ${m.boat_name} · ` : ''}joined {new Date(m.joined_at).toLocaleDateString()}
                </div>
              </div>
              {meIsOwner && m.username !== user?.username && (
                <div className="data-list-actions">
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => removeMember(m)} aria-label={`Remove ${m.display}`}>
                    <DeleteIcon />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Invite a boater</h2>
        <input
          className="form-field-input"
          placeholder="Search by name or boat name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim().length >= 2 && (
          <div className="search-results">
            {searching ? (
              <div className="form-field-help">Searching…</div>
            ) : results.length === 0 ? (
              <div className="form-field-help">No matching users.</div>
            ) : (
              <ul className="data-list">
                {results.map((u) => (
                  <li key={u.username} className="data-list-item">
                    <div className="data-list-icon"><GroupIcon /></div>
                    <div className="data-list-body">
                      <div className="data-list-title">{u.display}</div>
                      {u.boat_name && <div className="data-list-meta">Boat: {u.boat_name}</div>}
                    </div>
                    <div className="data-list-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => invite(u)}>Invite</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Chat</h2>
        <CrewChat crewId={id} />
      </section>
    </div>
  );
}

export default CrewDetail;
