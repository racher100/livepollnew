import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

// Participant page: pick an option, submit, see live results.
export default function Poll() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pick, setPick] = useState(null);

  const load = useCallback(() => api(`/polls/${id}`).then((d) => setS(d)).catch((e) => setErr(e.message)), [id]);

  useEffect(() => {
    // Open the stream first; (re)load a snapshot whenever it connects so no vote is missed.
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

  async function vote(optionId) {
    setBusy(true); setErr('');
    try {
      const d = await api(`/polls/${id}/vote`, { method: 'POST', body: { optionId } });
      setS((prev) => ({ ...prev, ...d }));
    } catch (e) { setErr(e.message); load(); }
    setBusy(false);
  }

  const top = (
    <div className="vote-top">
      <span className="brand">Live Poll</span>
      {s && <span className={`pill ${live ? 'on' : 'off'}`}>{live ? '● Live' : '○ Reconnecting…'}</span>}
    </div>
  );
  if (!s) return <div className="vote-page">{top}<p className={err ? 'error' : 'muted'}>{err || 'Loading…'}</p></div>;

  const voted = s.myVote != null;
  const canVote = !voted && !s.closed;

  return (
    <div className="vote-page">
      {top}
      <div className="card vote-card">
        <p className="eyebrow">{s.closed ? 'Voting closed' : voted ? 'Vote submitted' : 'Cast your vote'}</p>
        <h1>{s.poll.question}</h1>

        {voted && <div className="success"><Icon n="check" /> Thanks! Your vote is in. Results update live.</div>}
        {!voted && s.closed && <div className="notice">This poll is closed. Here are the final results.</div>}

        <div className="vopts">
          {s.poll.options.map((o) => {
            const n = s.counts[o.id] || 0;
            const pct = s.total ? Math.round((n * 100) / s.total) : 0;
            const cls = `vopt ${pick === o.id ? 'picked' : ''} ${s.myVote === o.id ? 'mine' : ''}`;
            return (
              <button key={o.id} className={cls} disabled={!canVote || busy} onClick={() => setPick(o.id)}>
                <span className="vbar" style={{ width: pct + '%' }} />
                <span className="vdot">{(pick === o.id || s.myVote === o.id) && <Icon n="check" size={13} />}</span>
                <span className="vtxt">{o.text}</span>
                <span className="vnum">{pct}% <small>({n})</small></span>
              </button>
            );
          })}
        </div>

        {err && <p className="error">{err}</p>}
        {canVote && (
          <button className="btn-pink big wide" disabled={pick == null || busy} onClick={() => vote(pick)}>
            <Icon n="send" /> {busy ? 'Submitting…' : 'Submit vote'}
          </button>
        )}

        <div className="row between wrap vfoot">
          <span className="muted"><Icon n="users" size={15} /> {s.total} vote{s.total === 1 ? '' : 's'} · <Icon n="eye" size={15} /> {s.viewers} watching</span>
          <button className="ghost sm" onClick={() => { navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            <Icon n={copied ? 'check' : 'link'} size={15} /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
