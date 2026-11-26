import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

// Same live-update logic as the voter page: open the SSE stream, reload a
// snapshot on every (re)connect, then merge pushed updates into state.
export function useLivePoll(id) {
  const [s, setS] = useState(null);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => api(`/polls/${id}`).then(setS).catch((e) => setErr(e.message)), [id]);

  useEffect(() => {
    setS(null); setErr('');
    const es = new EventSource(`/api/polls/${id}/stream`);
    es.onopen = () => { setLive(true); load(); };
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.deleted) { setErr('This poll was deleted by its owner.'); return; }
      setS((prev) => (prev ? { ...prev, ...m } : prev));
    };
    return () => es.close();
  }, [id, load]);

  return { s, setS, live, err, load };
}

export const COLORS = ['#f59e42', '#e0509a', '#3b82f6', '#f4c542', '#22c58b', '#8b5cf6', '#38bdf8', '#f87171', '#a3e635', '#fb923c'];

export const pctOf = (n, total) => (total ? Math.round((n * 100) / total) : 0);
