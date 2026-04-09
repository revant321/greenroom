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
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      {/* Settings gear — always visible in top-right corner of every page */}
      <button
        className="settings-gear"
        onClick={() => setSettingsOpen(true)}
        title="Settings"
      >
        ⚙️
      </button>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Routes>
        {/* Phase 1 */}
        <Route path="/" element={<Home />} />

        {/* Phase 2 — Show Hub + Musical Numbers */}
        <Route path="/show/:showId" element={<ShowHub />} />
        <Route path="/show/:showId/numbers" element={<MusicalNumbers />} />
        <Route path="/show/:showId/numbers/:numberId" element={<MusicalNumberDetail />} />

        {/* Phase 4 — Scenes */}
        <Route path="/show/:showId/scenes" element={<Scenes />} />
        <Route path="/show/:showId/scenes/:sceneId" element={<SceneDetail />} />

        {/* Phase 6 — Completed Shows */}
        <Route path="/completed" element={<CompletedShows />} />
        <Route path="/completed/:showId" element={<CompletedShowDetail />} />

        {/* Phase 5 — Standalone Songs */}
        <Route path="/song/:songId" element={<SongDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
