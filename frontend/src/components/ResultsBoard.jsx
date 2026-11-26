import { COLORS, pctOf } from '../useLivePoll.js';

// Horizontal coloured bars + legend (used by the live preview, projector view and Results tab).
export default function ResultsBoard({ s }) {
  return (
    <>
      <div className="scr-bars">
        {s.poll.options.map((o, i) => {
          const pct = pctOf(s.counts[o.id] || 0, s.total);
          return (
            <div className="scr-bar" key={o.id} style={{ width: pct + '%', background: COLORS[i % COLORS.length] }}>
              {pct}%
            </div>
          );
        })}
      </div>
      <div className="scr-legend">
        {s.poll.options.map((o, i) => (
          <span key={o.id}><i style={{ background: COLORS[i % COLORS.length] }} />{o.text}</span>
        ))}
      </div>
    </>
  );
}
