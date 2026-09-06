import { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import type { TagStreak } from '../../types';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${MONTH_ABBR[Number(month) - 1] ?? month} ${Number(day)}`;
}

function formatStreakRange(streak: TagStreak): string {
  if (!streak.longestStreakStart || !streak.longestStreakEnd) return '';
  if (streak.longestStreakStart === streak.longestStreakEnd) {
    return formatShortDate(streak.longestStreakStart);
  }
  return `${formatShortDate(streak.longestStreakStart)} \u2013 ${formatShortDate(streak.longestStreakEnd)}`;
}

// Names the streaks the heatmap above only shows visually -- current
// active streak per tag (and overall journaling), plus the longest
// streak ever with the actual date range it happened. A streak stays
// "active" through the day it's logged for -- see computeStreak on
// the server for why yesterday still counts, not just today.
export const Streaks = () => {
  const [streaks, setStreaks] = useState<TagStreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    NoteRoutes.getTagStreaks()
      .then(setStreaks)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="analyticsStatus">Loading...</p>;
  }

  if (streaks.length === 0) {
    return <p className="analyticsStatus">No streak history yet.</p>;
  }

  return (
    <div className="streakGrid">
      {streaks.map((streak) => (
        <div key={streak.name} className="streakCard">
          <div className="streakCardHeader">
            <span aria-hidden="true">{streak.icon}</span> {streak.name}
          </div>
          <div className="streakCurrentRow">
            {streak.currentStreak > 0 ? (
              <>
                <span className="streakFire" aria-hidden="true">🔥</span>
                <span className="streakCurrentNumber">{streak.currentStreak}</span>
                <span className="streakCurrentLabel">day{streak.currentStreak === 1 ? '' : 's'}</span>
              </>
            ) : (
              <span className="streakInactive">no active streak</span>
            )}
          </div>
          {streak.longestStreak > 0 && (
            <div className="streakLongestRow">
              Longest: {streak.longestStreak} day{streak.longestStreak === 1 ? '' : 's'}
              {formatStreakRange(streak) && <span className="streakRange"> ({formatStreakRange(streak)})</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
