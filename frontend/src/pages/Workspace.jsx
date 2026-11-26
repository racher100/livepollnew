import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import Home from './Home.jsx';
import NewPoll from './NewPoll.jsx';
import PollPanel from './PollPanel.jsx';

// App shell: sidebar (logo, navigation, polls, profile) + the selected view.
export default function Workspace() {
  const { token, user, logout } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'new' | poll id
  const [open, setOpen] = useState(false);  // mobile sidebar

  const load = useCallback(() => api('/my/polls', { token })
    .then((d) => setPolls(d.polls)).catch(() => {}).finally(() => setLoaded(true)), [token]);
  useEffect(() => { load(); }, [load]);

  const go = (v) => { setView(v); setOpen(false); };

  return (
    <div className="shell">
      <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon n="menu" size={22} /></button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="row between">
          <span className="brand">Live Poll</span>
          <button className="icon-btn side-x" onClick={() => setOpen(false)} aria-label="Close menu"><Icon n="x" /></button>
        </div>
        <button className="btn-pink wide" onClick={() => go('new')}><Icon n="plus" /> New Poll</button>

        <nav className="nav">
          <button className={`nav-item ${view === 'home' ? 'on' : ''}`} onClick={() => go('home')}><Icon n="home" /> Dashboard</button>
        </nav>

        <h4>My Polls</h4>
        <div className="poll-list">
          {loaded && polls.length === 0 && <p className="muted tiny">No polls yet.</p>}
          {polls.map(({ poll: p, total }) => (
            <button key={p.id} className={`poll-item ${view === p.id ? 'active' : ''}`} onClick={() => go(p.id)}>
              <span className="pi-q"><i className={`dot ${p.closed ? 'closed' : 'open'}`} />{p.question}</span>
              <span className="pi-m">{total} vote{total === 1 ? '' : 's'}{p.closed ? ' · closed' : ''}</span>
            </button>
          ))}
        </div>

        <div className="profile">
          <span className="avatar">{(user?.name || '?').trim()[0]?.toUpperCase()}</span>
          <div className="who"><b>{user?.name}</b><small>{user?.email}</small></div>
          <button className="icon-btn" title="Log out" onClick={logout}><Icon n="logout" /></button>
        </div>
      </aside>

      <section className="content">
        {view === 'home' && <Home user={user} polls={polls} loaded={loaded} go={go} />}
        {view === 'new' && <NewPoll token={token} onCreated={(id) => load().then(() => go(id))} />}
        {view !== 'home' && view !== 'new' && (
          <PollPanel key={view} id={view} token={token} onChanged={load}
            onDeleted={() => load().then(() => go('home'))} />
        )}
      </section>
    </div>
  );
}
