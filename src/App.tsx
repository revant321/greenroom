import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ShowHub from './pages/ShowHub';
import MusicalNumbers from './pages/MusicalNumbers';
import MusicalNumberDetail from './pages/MusicalNumberDetail';
import Scenes from './pages/Scenes';
import SceneDetail from './pages/SceneDetail';
import SongDetail from './pages/SongDetail';
import CompletedShows from './pages/CompletedShows';
import CompletedShowDetail from './pages/CompletedShowDetail';
import LoginPage from './pages/LoginPage';
import SettingsPanel from './components/SettingsPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Settings gear only shown when logged in — no point in configuring
// settings on the login screen.
function SettingsGear({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <button className="settings-gear" onClick={onOpen} title="Settings">
      ⚙️
    </button>
  );
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <SettingsGear onOpen={() => setSettingsOpen(true)} />
        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Phase 1 */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* Phase 2 — Show Hub + Musical Numbers */}
          <Route path="/show/:showId" element={<ProtectedRoute><ShowHub /></ProtectedRoute>} />
          <Route path="/show/:showId/numbers" element={<ProtectedRoute><MusicalNumbers /></ProtectedRoute>} />
          <Route path="/show/:showId/numbers/:numberId" element={<ProtectedRoute><MusicalNumberDetail /></ProtectedRoute>} />

          {/* Phase 4 — Scenes */}
          <Route path="/show/:showId/scenes" element={<ProtectedRoute><Scenes /></ProtectedRoute>} />
          <Route path="/show/:showId/scenes/:sceneId" element={<ProtectedRoute><SceneDetail /></ProtectedRoute>} />

          {/* Phase 6 — Completed Shows */}
          <Route path="/completed" element={<ProtectedRoute><CompletedShows /></ProtectedRoute>} />
          <Route path="/completed/:showId" element={<ProtectedRoute><CompletedShowDetail /></ProtectedRoute>} />

          {/* Phase 5 — Standalone Songs */}
          <Route path="/song/:songId" element={<ProtectedRoute><SongDetail /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
