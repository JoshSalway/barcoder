import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import storage from '../services/storage';

export default function ListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    setItems(query ? storage.search(query) : storage.getAll());
  }, [query]);

  function refresh() {
    setItems(query ? storage.search(query) : storage.getAll());
  }

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
                    <span className="item-digits">{item.digits}</span>
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

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/')}>Create</button>
        <button className="nav-btn" onClick={() => navigate('/scan')}>Scan</button>
        <button className="nav-btn active" onClick={() => navigate('/list')}>Saved</button>
      </nav>
    </div>
  );
}
