import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTagColor } from '../../utils/tagColor';

interface TagBarChartProps {
  labels: string[];
  series: { name: string; icon: string; counts: number[] }[];
}

// Reusable grouped bar chart for anything shaped as {labels, series} --
// used for both day-of-week and seasonality, which share this exact
// shape (just 7 vs 12 labels), so the chart itself doesn't need two
// separate implementations.
export const TagBarChart = ({ labels, series }: TagBarChartProps) => {
  const chartData = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const tag of series) {
      row[tag.name] = tag.counts[i];
    }
    return row;
  });

  return (
    <div className="analyticsChartCard">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ns-rule)" />
          <XAxis
            dataKey="label"
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
          {series.map((tag) => (
            <Bar
              key={tag.name}
              dataKey={tag.name}
              name={`${tag.icon} ${tag.name}`}
              fill={getTagColor(tag.name).text}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
