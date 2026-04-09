import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

/**
 * CompletedShows lists all shows that have been marked as completed.
 * Each card displays:
 * - Show name
 * - Role(s) the user played
 * - Completion date formatted for readability
 *
 * Tapping a show navigates to a read-only detail view where the user
 * can browse the show's structure and any media they chose to keep
 * during the completion flow. They can also delete remaining data
 * from that detail view to free storage.
 */
export default function CompletedShows() {
  const navigate = useNavigate();

  // Query all completed shows, sorted by completion date (most recent first).
  // isCompleted is stored as a number (1) for IndexedDB indexing compatibility.
  const completedShows = useLiveQuery(
    () => db.shows
      .where('isCompleted')
      .equals(1)
      .toArray()
      .then(shows =>
        shows.sort((a, b) => {
          // Sort by completedAt descending — most recently completed first
          const dateA = a.completedAt ? a.completedAt.getTime() : 0;
          const dateB = b.completedAt ? b.completedAt.getTime() : 0;
          return dateB - dateA;
        })
      )
  );

  /**
   * Formats a Date into a readable string like "Mar 15, 2026".
   * Uses the browser's Intl.DateTimeFormat for locale-aware formatting.
   */
  function formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Home
        </button>
        <h1 style={{ fontSize: 22 }}>Completed Shows</h1>
        {/* Empty spacer to keep title centered */}
        <div style={{ width: 60 }} />
      </header>

      <div className="completed-list">
        {completedShows === undefined ? (
          <p className="empty-state">Loading...</p>
        ) : completedShows.length === 0 ? (
          <p className="empty-state">
            No completed shows yet. When you finish a show, it'll appear here.
          </p>
        ) : (
          completedShows.map((show) => (
            <div
              key={show.id}
              className="completed-card"
              onClick={() => navigate(`/completed/${show.id}`)}
            >
              <div className="completed-card-info">
                <span className="completed-card-name">{show.name}</span>
                {show.roles.length > 0 && (
                  <span className="completed-card-roles">
                    {show.roles.join(', ')}
                  </span>
                )}
              </div>
              <span className="completed-card-date">
                {formatDate(show.completedAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
