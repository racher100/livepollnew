import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Poll from './pages/Poll.jsx';
import Workspace from './pages/Workspace.jsx';
import Display from './pages/Display.jsx';

function Guard({ children }) {
  const { token, ready } = useAuth();
  if (!ready) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  return token ? children : <Navigate to="/login" replace />;
}

// Every page draws its own layout (dashboard shell, login, voter page, projector).
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guard><Workspace /></Guard>} />
      <Route path="/d/:id" element={<Display />} />
      <Route path="/login" element={<Login />} />
      <Route path="/p/:id" element={<Poll />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
