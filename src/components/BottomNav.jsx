import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/scan', label: 'Scan' },
  { path: '/', label: 'Create' },
  { path: '/list', label: 'Saved' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ path, label }) => (
        <button
          key={path}
          className={`nav-btn${location.pathname === path ? ' active' : ''}`}
          onClick={() => navigate(path)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
