import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import storage from '../services/storage';

export default function ListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const [, setVersion] = useState(0);

  // localStorage is the source of truth; read it each render and bump `version` after writes.
  const items = query ? storage.search(query) : storage.getAll();
  const gaps = query ? [] : storage.findSequenceGaps();
  const refresh = () => setVersion((v) => v + 1);

  function handleDelete(id) {
    storage.remove(id);
    refresh();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditTitle(item.title);
  }

  function saveEdit(item) {
    storage.save({ ...item, title: editTitle.trim() || item.digits });
    setEditingId(null);
    refresh();
  }

  return (
    <div className="page list-page">
      <h1>Saved Barcodes</h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Search by title or digits..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {gaps.length > 0 && !query && (
        <div className="gaps-section">
          <p className="gaps-title">Missing from sequences</p>
          <ul className="gaps-list">
            {gaps.map((gap) => (
              <li key={gap.digits} className="gap-item">
                <span className="gap-digits">{gap.digits}</span>
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => navigate(`/?digits=${encodeURIComponent(gap.digits)}&format=${encodeURIComponent(gap.format)}`)}
                >
                  Create
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>{query ? 'No matches found.' : 'No saved barcodes yet.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Create One
          </button>
        </div>
      ) : (
        <ul className="barcode-list">
          {items.map((item) => (
            <li key={item.id} className="barcode-item">
              {editingId === item.id ? (
                <div className="edit-row">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-small btn-primary" onClick={() => saveEdit(item)}>
                    Save
                  </button>
                  <button className="btn btn-small btn-secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="item-main"
                    onClick={() => navigate(`/display/${item.id}`)}
                  >
                    <span className="item-title">{item.title}</span>
                    <span className="item-digits">{item.digits}{item.brand ? ` · ${item.brand}` : ''}</span>
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-small btn-secondary" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </div>
  );
}
