import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import ResultsBoard from './ResultsBoard.jsx';

export const joinUrl = (id) => `${location.origin}/p/${id}`;

export function useQr(text, width = 512) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let off = false;
    QRCode.toDataURL(text, { width, margin: 2, color: { dark: '#0b0d14', light: '#ffffff' } })
      .then((u) => !off && setSrc(u)).catch(() => {});
    return () => { off = true; };
  }, [text, width]);
  return src;
}

// What the audience sees on the projector. Sizes are in em so it scales from the small
// "Live Preview" box in the dashboard up to a full-screen display.
export default function DisplayScreen({ s, full = false }) {
  const url = joinUrl(s.poll.id);
  const qr = useQr(url);
  const mode = s.display || 'results';

  return (
    <div className={`screen ${full ? 'full' : ''}`}>
      <div className="scr-in">
        {mode === 'lobby' && (
          <>
            <h2 className="scr-title">Join the poll</h2>
            <img className="scr-qr" src={qr} alt="Scan to join" />
            <p className="scr-link">{url.replace(/^https?:\/\//, '')}</p>
            <p className="scr-sub">👁 {s.viewers} watching</p>
          </>
        )}
        {mode === 'voting' && (
          <>
            <h2 className="scr-title">{s.poll.question}</h2>
            <p className="scr-sub">{s.closed ? 'Voting is closed' : 'Scan the QR code or open the link to vote'}</p>
            <div className="scr-count"><b>{s.total}</b> vote{s.total === 1 ? '' : 's'} in</div>
            <p className="scr-link">{url.replace(/^https?:\/\//, '')}</p>
          </>
        )}
        {mode === 'results' && (
          <>
            <h2 className="scr-title">{s.poll.question}</h2>
            <ResultsBoard s={s} />
          </>
        )}
      </div>
    </div>
  );
}
