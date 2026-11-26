import { useParams } from 'react-router-dom';
import { useLivePoll } from '../useLivePoll.js';
import DisplayScreen from '../components/DisplayScreen.jsx';

// Public full-screen projector view: /d/:id (no login needed).
export default function Display() {
  const { id } = useParams();
  const { s, live, err } = useLivePoll(id);
  if (!s) return <div className="screen full"><p className="scr-sub">{err || 'Loading…'}</p></div>;
  return (
    <div className="display-wrap">
      <DisplayScreen s={s} full />
      <div className="display-tools">
        <span className={`pill ${live ? 'on' : 'off'}`}>{live ? '● Live' : '○ Reconnecting…'}</span>
        <button className="ghost" onClick={() => document.documentElement.requestFullscreen?.()}>⛶ Full screen</button>
      </div>
    </div>
  );
}
