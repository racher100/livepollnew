import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const { token } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [polls, setPolls] = useState([]);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(() => api('/my/polls', { token }).then((d) => setPolls(d.polls)).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);

  const setOpt = (i, v) => setOptions(options.map((o, j) => (j === i ? v : o)));

  async function create(e) {
    e.preventDefault();
    setErr('');
    try {
      await api('/polls', { method: 'POST', token, body: { question, options: options.filter((o) => o.trim()) } });
      setQuestion(''); setOptions(['', '']); load();
    } catch (e) { setErr(e.message); }
  }
  const toggle = (p) => api(`/polls/${p.id}/close`, { method: 'PATCH', token, body: { closed: !p.closed } }).then(load).catch((e) => setErr(e.message));
  const remove = (p) => confirm('Delete this poll and all its votes?') && api(`/polls/${p.id}`, { method: 'DELETE', token }).then(load).catch((e) => setErr(e.message));
  const copy = (id) => { navigator.clipboard.writeText(`${location.origin}/p/${id}`); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  return (
    <>
      <form className="card" onSubmit={create}>
        <h2>Create a poll</h2>
        <input placeholder="Ask a question…" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} required />
        {options.map((o, i) => (
          <div className="row" key={i}>
            <input placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} maxLength={100} />
            {options.length > 2 && <button type="button" className="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))}>✕</button>}
          </div>
        ))}
        {options.length < 10 && <button type="button" className="link" onClick={() => setOptions([...options, ''])}>+ Add option</button>}
        {err && <p className="error">{err}</p>}
        <button>Create poll</button>
      </form>

      <h2>Your polls</h2>
      {polls.length === 0 && <p className="muted">No polls yet. Create your first one above.</p>}
      {polls.map(({ poll: p, total }) => (
        <div className="card" key={p.id}>
          <div className="row between">
            <strong>{p.question}</strong>
            <span className={`pill ${p.closed ? 'off' : 'on'}`}>{p.closed ? 'Closed' : 'Open'}</span>
          </div>
          <p className="muted">{total} vote{total === 1 ? '' : 's'}</p>
          <div className="row wrap">
            <Link className="btn" to={`/p/${p.id}`}>Open live results</Link>
            <button className="ghost" onClick={() => copy(p.id)}>{copied === p.id ? 'Copied ✓' : 'Copy link'}</button>
            <button className="ghost" onClick={() => toggle(p)}>{p.closed ? 'Reopen' : 'Close'}</button>
            <button className="ghost danger" onClick={() => remove(p)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
