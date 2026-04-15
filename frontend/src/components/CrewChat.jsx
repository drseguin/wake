/**
 * CrewChat — per-crew message board.
 *
 * @fileoverview Polls /crews/{id}/messages every 10 seconds and renders
 * messages oldest-at-top. Sending posts and immediately re-fetches.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useToast } from '../App';
import { useAuth } from '../contexts/AuthContext';

const POLL_INTERVAL_MS = 10_000;

function CrewChat({ crewId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const lastIdRef = useRef(null);

  async function reload() {
    try {
      const list = await api.listMessages(crewId);
      const oldestFirst = [...list].reverse();
      setMessages(oldestFirst);
      const newest = oldestFirst[oldestFirst.length - 1];
      if (newest && newest.id !== lastIdRef.current) {
        lastIdRef.current = newest.id;
        // Defer to next paint so the new node exists.
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });
      }
    } catch (err) {
      // Silent — the page itself shows errors elsewhere.
    }
  }

  useEffect(() => {
    reload();
    const id = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [crewId]);

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.postMessage(crewId, text);
      setBody('');
      await reload();
    } catch (err) {
      showToast('Send failed', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="crew-chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet — start the conversation.</div>
        ) : (
          messages.map((m) => {
            const mine = m.username === user?.username;
            return (
              <div key={m.id} className={`chat-msg ${mine ? 'chat-msg--mine' : ''}`}>
                {!mine && <div className="chat-msg-author">{m.display}</div>}
                <div className="chat-msg-bubble">{m.body}</div>
                <div className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-composer" onSubmit={send}>
        <input
          className="form-field-input"
          placeholder="Send a message…"
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default CrewChat;
