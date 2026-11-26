import { useState } from 'react';
import { api } from '../api.js';
import { useLivePoll, COLORS, pctOf } from '../useLivePoll.js';
import DisplayScreen, { joinUrl, useQr } from '../components/DisplayScreen.jsx';
import ResultsBoard from '../components/ResultsBoard.jsx';
import Icon from '../components/Icon.jsx';

const STATUS = { lobby: ['Lobby', 'off'], voting: ['Voting live', 'wait'], results: ['Results shown', 'on'] };

export default function PollPanel({ id, token, onChanged, onDeleted }) {
  const { s, setS, live, err, load } = useLivePoll(id);
  const [tab, setTab] = useState('live');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const url = joinUrl(id);
  const qr = useQr(url);

  if (!s) return <p className={err ? 'error' : 'muted'}>{err || 'Loading…'}</p>;
  const mode = s.display || 'results';
  const run = (p) => p.catch((e) => setMsg(e.message));

  const setDisplay = (d) => { setMsg(''); setS((v) => ({ ...v, display: d })); run(api(`/polls/${id}/display`, { method: 'PATCH', token, body: { display: d } })); };
  const reset = () => confirm('Reset all votes for this poll? This cannot be undone.') &&
    run(api(`/polls/${id}/reset`, { method: 'POST', token }).then(() => { load(); onChanged(); }));
  const remove = () => confirm('Delete this poll and all its votes?') &&
    run(api(`/polls/${id}`, { method: 'DELETE', token }).then(onDeleted));
  const toggle = () => run(api(`/polls/${id}/close`, { method: 'PATCH', token, body: { closed: !s.closed } }).then(onChanged));
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const exportCsv = () => {
    const rows = [['Option', 'Votes', 'Percent'], ...s.poll.options.map((o) => [o.text, s.counts[o.id] || 0, pctOf(s.counts[o.id] || 0, s.total) + '%'])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `poll-${id}-results.csv`;
    a.click();
  };

  const best = s.poll.options.reduce((b, o) => ((s.counts[o.id] || 0) > (s.counts[b?.id] || 0) ? o : b), null);
  const [label, tone] = STATUS[mode];

  return (
    <>
      <div className="panel-head">
        <h1>{s.poll.question}</h1>
        <div className="row wrap">
          <button className="ghost" onClick={toggle}><Icon n={s.closed ? 'play' : 'pause'} /> {s.closed ? 'Start voting' : 'Stop voting'}</button>
          <button className="ghost" onClick={reset}><Icon n="reset" /> Reset Votes</button>
          <button className="btn-pink" onClick={remove}><Icon n="trash" /> Delete Poll</button>
        </div>
      </div>
      {msg && <p className="error">{msg}</p>}

      <div className="tabs">
        {[['live', 'Live'], ['questions', 'Questions'], ['results', 'Results']].map(([k, t]) => (
          <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{t}</button>
        ))}
        <span className={`pill ${live ? 'on' : 'off'} tab-pill`}>{live ? '● Live' : '○ Reconnecting…'}</span>
      </div>

      {tab === 'live' && (
        <>
          <div className="stats3 live-strip">
            <div className="stat-card green"><span className="stat-ic"><Icon n="vote" size={20} /></span><div><small>Voting</small><b className="sm">{s.closed ? 'Stopped' : 'Open'}</b></div></div>
            <div className="stat-card purple"><span className="stat-ic"><Icon n="users" size={20} /></span><div><small>Votes</small><b>{s.total}</b></div></div>
            <div className="stat-card blue"><span className="stat-ic"><Icon n="eye" size={20} /></span><div><small>Watching</small><b>{s.viewers}</b></div></div>
          </div>
          <div className="share-box">
            <div><small>QR Code</small>
              <a className="btn ghost" href={qr} download={`poll-${id}-qr.png`}><Icon n="qr" /> Download QR</a></div>
            <div><small>Join Link · <span className="join-url">{url.replace(/^https?:\/\//, '')}</span></small>
              <button className="ghost" onClick={copy}><Icon n={copied ? 'check' : 'link'} /> {copied ? 'Copied' : 'Copy Link'}</button></div>
            <div><small>Projector View</small>
              <a className="btn ghost" href={`/d/${id}`} target="_blank" rel="noreferrer"><Icon n="monitor" /> Open Display</a></div>
          </div>

          <div className="grid2">
            <div>
              <h3>Control Flow</h3>
              <div className="ctl">
                <button className={`ghost wide ${mode === 'lobby' ? 'sel' : ''}`} onClick={() => setDisplay('lobby')}><Icon n="lobby" /> Show Lobby Screen</button>
                <div className="ctl-row">
                  <span className={`badge ${tone}`}>{label}</span>
                  <span className="ctl-q">{s.poll.question}</span>
                  <button className="ghost" disabled={mode === 'voting'} onClick={() => setDisplay('voting')}>Push</button>
                  <button className="btn-pink" disabled={mode !== 'voting'} onClick={() => setDisplay('results')}>Reveal</button>
                </div>
                <p className="muted tiny">Push shows the question and hides results on the projector. Reveal shows the live results.</p>
              </div>
            </div>
            <div>
              <h3>Live Preview</h3>
              <DisplayScreen s={s} />
            </div>
          </div>
        </>
      )}

      {tab === 'questions' && (
        <div className="card">
          <div className="row between wrap">
            <strong>{s.poll.question}</strong>
            <span className={`pill ${s.closed ? 'off' : 'on'}`}>{s.closed ? 'Closed' : 'Open'}</span>
          </div>
          {s.poll.options.map((o, i) => (
            <div className="q-opt" key={o.id}>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              <span>{o.text}</span>
              <span className="muted">{s.counts[o.id] || 0} vote{(s.counts[o.id] || 0) === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <>
          <div className="stats">
            <div className="stat"><small>Total votes</small><b>{s.total}</b></div>
            <div className="stat"><small>Watching now</small><b>{s.viewers}</b></div>
            <div className="stat"><small>Leading</small><b className="sm">{s.total && best ? best.text : '—'}</b></div>
            <div className="stat"><small>Status</small><b className="sm">{s.closed ? 'Closed' : 'Open'}</b></div>
          </div>
          <div className="screen results-only"><div className="scr-in"><ResultsBoard s={s} /></div></div>
          <div className="row"><button className="ghost" onClick={exportCsv}><Icon n="download" /> Export CSV</button></div>
        </>
      )}
    </>
  );
}
