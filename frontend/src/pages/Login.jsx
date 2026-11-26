import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api(`/auth/${mode}`, { method: 'POST', body: form });
      login(d.token, d.user);
      nav('/');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <span className="brand">Live Poll</span>
        <h2>Ask. Share. Watch the votes roll in.</h2>
        <ul>
          <li><Icon n="send" /> Create a poll in seconds</li>
          <li><Icon n="qr" /> Share with a QR code or link</li>
          <li><Icon n="bars" /> Real-time results on any screen</li>
        </ul>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">Log in to create polls. Voting never needs an account.</p>
        {mode === 'signup' && <input placeholder="Name" value={form.name} onChange={set('name')} required maxLength={60} />}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={set('password')} required minLength={8} maxLength={72} />
        {err && <p className="error">{err}</p>}
        <button className="btn-pink big" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="link" onClick={() => { setErr(''); setMode(mode === 'login' ? 'signup' : 'login'); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
