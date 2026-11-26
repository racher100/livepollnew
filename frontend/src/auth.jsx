import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!token);

  useEffect(() => {
    if (!token) { setUser(null); setReady(true); return; }
    api('/auth/me', { token })
      .then((d) => setUser(d.user))
      .catch(() => { localStorage.removeItem('token'); setToken(null); })
      .finally(() => setReady(true));
  }, [token]);

  const login = useCallback((t, u) => { localStorage.setItem('token', t); setUser(u); setToken(t); }, []);
  const logout = useCallback(() => { localStorage.removeItem('token'); setUser(null); setToken(null); }, []);

  return <Ctx.Provider value={{ token, user, ready, login, logout }}>{children}</Ctx.Provider>;
}
