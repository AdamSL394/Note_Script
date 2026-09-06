import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import NoteRoutes from '../../router/noteRoutes';
import type { TagTimeSeries } from '../../types';
import { getTagColor } from '../../utils/tagColor';
import { Heatmap } from './heatmap';
import './analytics.css';

type Granularity = 'week' | 'month' | 'year';

// Default window length per granularity -- 12 weeks (~3 months), 12
// months (1 year), or 5 years, each a reasonable amount of history to
// chart without either being too sparse or too crowded on one axis.
const DEFAULT_COUNT: Record<Granularity, number> = { week: 12, month: 12, year: 5 };

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats a raw bucket string into a short axis label, differently
// per granularity: a week bucket is a full 'YYYY-MM-DD' Monday date
// (shown as "Sep 7"), a month bucket is 'YYYY-MM' (shown as "Sep"),
// and a year bucket is already just 'YYYY'.
function formatBucketLabel(bucket: string, granularity: Granularity): string {
  if (granularity === 'year') return bucket;
  if (granularity === 'month') {
    const [, month] = bucket.split('-');
    return MONTH_ABBR[Number(month) - 1] ?? bucket;
  }
  const [, month, day] = bucket.split('-');
  return `${MONTH_ABBR[Number(month) - 1] ?? month} ${Number(day)}`;
}

// A first, deliberately simple slice of analytics: real aggregations
// over data that already exists (tags, dates, star ratings), no AI
// needed. A line chart -- a two-point "this period vs last period"
// comparison doesn't show the shape of a trend, which is what
// actually helps here. Granularity is user-selectable (week/month/
// year) so the same chart can zoom into recent weekly detail or zoom
// out to multi-year patterns.
export const Analytics = () => {
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [timeSeries, setTimeSeries] = useState<TagTimeSeries>({ buckets: [], granularity: 'month', series: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await NoteRoutes.getTagTimeSeries(granularity, DEFAULT_COUNT[granularity]);
        setTimeSeries(result);
      } catch {
        setError('Could not load analytics right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [granularity]);

  if (error) {
    return <div className="analyticsContainer"><p className="analyticsStatus">{error}</p></div>;
  }

  const chartData = timeSeries.buckets.map((bucket, i) => {
    const row: Record<string, string | number> = { bucket: formatBucketLabel(bucket, granularity) };
    for (const tag of timeSeries.series) {
      row[tag.name] = tag.counts[i];
    }
    return row;
  });

  return (
    <div className="analyticsContainer">
      <h1 className="analyticsHeading">Tag Insights</h1>
      <p className="analyticsSubheading">How your most-used tags have trended over time.</p>

      <div className="granularityToggleRow">
        {(['week', 'month', 'year'] as Granularity[]).map((g) => (
          <button
            key={g}
            type="button"
            className={granularity === g ? 'granularityToggleButton active' : 'granularityToggleButton'}
            onClick={() => setGranularity(g)}
          >
            {g === 'week' ? 'Weeks' : g === 'month' ? 'Months' : 'Years'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="analyticsStatus">Loading...</p>
      ) : timeSeries.series.length === 0 ? (
        <p className="analyticsStatus">
          {granularity === 'week'
            ? 'Not enough tagged history yet to chart a weekly trend.'
            : 'Not enough tagged history yet to chart a trend -- add a few tags to your notes and check back here.'}
        </p>
      ) : (
        <div className="analyticsChartCard">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ns-rule)" />
              <XAxis
                dataKey="bucket"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ns-graphite)' }}
                axisLine={{ stroke: 'var(--ns-rule)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ns-graphite)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  background: 'var(--ns-paper)',
                  border: '0.5px solid var(--ns-rule)',
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              {timeSeries.series.map((tag) => (
                <Line
                  key={tag.name}
                  type="monotone"
                  dataKey={tag.name}
                  name={`${tag.icon} ${tag.name}`}
                  stroke={getTagColor(tag.name).text}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="analyticsSectionHeading">Activity</h2>
      <p className="analyticsSubheading">A day-by-day look at your journaling -- gaps and streaks, at a glance.</p>
      <Heatmap />
    </div>
  );
};
