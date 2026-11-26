// Small built-in icon set (no extra package needed).
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  plus: 'M12 5v14M5 12h14',
  bars: 'M5 20V10M12 20V4M19 20v-7',
  logout: 'M15 17l5-5-5-5M20 12H9M12 4H5v16h7',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6h-6',
  monitor: 'M3 4h18v12H3zM8 21h8M12 16v5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 5v14M16 5v14',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  check: 'M5 12l5 5 9-10',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  lobby: 'M3 11l9-8 9 8M6 10v10h12V10',
  send: 'M4 12l16-8-6 16-3-7z',
  users: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-2a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  vote: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',
};

export default function Icon({ n, size = 18 }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}
