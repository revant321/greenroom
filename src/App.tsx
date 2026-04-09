import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ShowHub from './pages/ShowHub';
import MusicalNumbers from './pages/MusicalNumbers';
import MusicalNumberDetail from './pages/MusicalNumberDetail';
import Scenes from './pages/Scenes';
import SceneDetail from './pages/SceneDetail';

// Placeholder for pages not yet built
function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <h2>{title}</h2>
      <p>Coming soon...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="/completed" element={<Placeholder title="Completed Shows" />} />
      </Routes>
    </BrowserRouter>
  );
}
