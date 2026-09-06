import { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import type { HeatmapResponse, TagAnalytics } from '../../types';

const DAY_ROW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 5 intensity buckets (0 = none, 1-4 = increasing activity), matching
// the classic GitHub contribution-graph pattern but using the app's
// own blue accent rather than green, to stay visually consistent with
// the rest of the app's palette.
function intensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return 'heatmapCell level0';
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 'heatmapCell level1';
  if (ratio <= 0.5) return 'heatmapCell level2';
  if (ratio <= 0.75) return 'heatmapCell level3';
  return 'heatmapCell level4';
}

// A GitHub-commit-style contribution grid: one cell per day over the
// trailing year, shaded by how many notes that day had (or, when a
// tag filter is picked, by how many notes carrying that specific tag
// that day had). Gaps and streaks are far more visible here than in
// any list of numbers -- this is the actual point of a calendar
// heatmap over a table.
export const Heatmap = () => {
  const [data, setData] = useState<HeatmapResponse>({ days: [], maxCount: 0 });
  const [availableTags, setAvailableTags] = useState<TagAnalytics[]>([]);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    NoteRoutes.getTagAnalytics().then(setAvailableTags);
  }, []);

  useEffect(() => {
    setLoading(true);
    NoteRoutes.getActivityHeatmap(tagFilter || undefined)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tagFilter]);

  if (loading && data.days.length === 0) {
    return <p className="analyticsStatus">Loading...</p>;
  }

  const weekCount = data.days.length > 0 ? Math.max(...data.days.map((d) => d.week)) + 1 : 0;

  // Which week-columns should show a month label above them -- the
  // first week where a new month's 1st falls, so labels don't repeat
  // needlessly across every column of the same month.
  const monthLabelByWeek = new Map<number, string>();
  let lastMonth = -1;
  for (const day of data.days) {
    const month = Number(day.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      monthLabelByWeek.set(day.week, MONTH_ABBR[month]);
      lastMonth = month;
    }
  }

  return (
    <div>
      <div className="heatmapControls">
        <label className="heatmapFilterLabel" htmlFor="heatmapTagFilter">
          Show:
        </label>
        <select
          id="heatmapTagFilter"
          className="heatmapFilterSelect"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All notes</option>
          {availableTags.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.icon} {tag.name}
            </option>
          ))}
        </select>
      </div>

      <div className="heatmapScroll">
        <div className="heatmapGridWrapper">
          <div className="heatmapMonthRow" style={{ gridTemplateColumns: `repeat(${weekCount}, 11px)` }}>
            {Array.from({ length: weekCount }, (_, week) => (
              <span key={week} className="heatmapMonthLabel">
                {monthLabelByWeek.get(week) ?? ''}
              </span>
            ))}
          </div>
          <div className="heatmapBody">
            <div className="heatmapDayLabels">
              {DAY_ROW_LABELS.map((label, i) => (
                <span key={i} className="heatmapDayLabel">
                  {label}
                </span>
              ))}
            </div>
            <div className="heatmapGrid" style={{ gridTemplateColumns: `repeat(${weekCount}, 11px)` }}>
              {data.days.map((day) => (
                <div
                  key={day.date}
                  className={intensityClass(day.count, data.maxCount)}
                  style={{ gridColumn: day.week + 1, gridRow: day.dayOfWeek + 1 }}
                  title={`${day.date}: ${day.count} note${day.count === 1 ? '' : 's'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
