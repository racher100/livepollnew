import { useState } from 'react';
import Icon from '../components/Icon.jsx';

const first = (name = '') => name.trim().split(' ')[0] || 'there';

// Dashboard overview: welcome, totals and recent polls.
export default function Home({ user, polls, loaded, go }) {
  const [copied, setCopied] = useState('');
  const active = polls.filter((x) => !x.poll.closed).length;
  const votes = polls.reduce((a, x) => a + x.total, 0);
  const copy = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${location.origin}/p/${id}`);
    setCopied(id); setTimeout(() => setCopied(''), 1500);
  };

  const stats = [
    ['bars', 'Total polls', polls.length, 'purple'],
    ['play', 'Active polls', active, 'green'],
    ['users', 'Total votes', votes, 'blue'],
  ];

  return (
    <>
      <div className="panel-head">
        <div>
          <h1>Welcome back, {first(user?.name)} 👋</h1>
          <p className="muted">Here’s what’s happening with your polls.</p>
        </div>
        <button className="btn-pink" onClick={() => go('new')}><Icon n="plus" /> Create New Poll</button>
      </div>

      <div className="stats3">
        {stats.map(([ic, label, n, tone]) => (
          <div className={`stat-card ${tone}`} key={label}>
            <span className="stat-ic"><Icon n={ic} size={22} /></span>
            <div><small>{label}</small><b>{loaded ? n : '–'}</b></div>
          </div>
        ))}
      </div>

      <h3 className="sec">Recent polls</h3>
      {loaded && polls.length === 0 && (
        <div className="empty">
          <Icon n="vote" size={34} />
          <p>You haven’t created any polls yet.</p>
          <button className="btn-pink" onClick={() => go('new')}><Icon n="plus" /> Create your first poll</button>
        </div>
      )}
      <div className="poll-grid">
        {polls.slice(0, 6).map(({ poll: p, total }) => (
          <div className="poll-card" key={p.id} onClick={() => go(p.id)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && go(p.id)}>
            <div className="row between">
              <span className={`status ${p.closed ? 'closed' : 'open'}`}>{p.closed ? 'Closed' : 'Live'}</span>
              <button className="icon-btn" title="Copy join link" onClick={(e) => copy(e, p.id)}>
                <Icon n={copied === p.id ? 'check' : 'link'} />
              </button>
            </div>
            <h4>{p.question}</h4>
            <div className="poll-meta">
              <span><Icon n="users" size={15} /> {total} vote{total === 1 ? '' : 's'}</span>
              <span>{new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
