import { Routes, Route } from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import ScanPage from './pages/ScanPage';
import ListPage from './pages/ListPage';
import DisplayPage from './pages/DisplayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/list" element={<ListPage />} />
      <Route path="/display/:id" element={<DisplayPage />} />
    </Routes>
  );
}
