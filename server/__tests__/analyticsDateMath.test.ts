import {
    computeTrendPeriodBoundaries,
    getTrailingBuckets,
    computeStreak,
    getHeatmapGridStart,
    buildHeatmapGrid,
} from '../controller/noteController';

describe('computeTrendPeriodBoundaries', () => {
    it('computes exact 7-day current and previous periods for "week", with no gap or overlap', () => {
        const today = new Date(2026, 8, 6); // Sept 6, 2026
        const { currentStart, previousStart } = computeTrendPeriodBoundaries('week', today);
        expect(currentStart).toBe('2026-08-31');
        expect(previousStart).toBe('2026-08-24');
        // The day immediately before currentStart should be the last day
        // of the previous period -- no gap, no overlap.
        expect(new Date(new Date(currentStart).getTime() - 86400000).toISOString().slice(0, 10)).toBe(
            '2026-08-30'
        );
    });

    it('computes 30-day boundaries for "month"', () => {
        const today = new Date(2026, 8, 6);
        const { currentStart, previousStart } = computeTrendPeriodBoundaries('month', today);
        expect(currentStart).toBe('2026-08-08');
        expect(previousStart).toBe('2026-07-09');
    });

    it('computes 365-day boundaries for "year", correctly crossing a year boundary', () => {
        const today = new Date(2026, 8, 6);
        const { currentStart, previousStart } = computeTrendPeriodBoundaries('year', today);
        expect(currentStart).toBe('2025-09-07');
        expect(previousStart).toBe('2024-09-07');
    });
});

describe('getTrailingBuckets', () => {
    it('generates trailing weeks 7 days apart, ending on the Monday of the week containing today', () => {
        const today = new Date(2026, 8, 6); // a Sunday
        const weeks = getTrailingBuckets('week', 4, today);
        expect(weeks).toEqual(['2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']);
    });

    it('generates trailing months, correctly crossing a year boundary', () => {
        const today = new Date(2026, 1, 15); // Feb 15, 2026
        const months = getTrailingBuckets('month', 12, today);
        expect(months[0]).toBe('2025-03');
        expect(months[months.length - 1]).toBe('2026-02');
        expect(months).toHaveLength(12);
    });

    it('generates trailing years ending with the current year', () => {
        const today = new Date(2026, 8, 6);
        expect(getTrailingBuckets('year', 5, today)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    });
});

describe('computeStreak', () => {
    it('reports an active streak that ends today', () => {
        const result = computeStreak(['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'], '2026-09-06');
        expect(result.currentStreak).toBe(4);
        expect(result.longestStreak).toBe(4);
    });

    it('still reports an active streak when the last entry was yesterday, not just today', () => {
        // The day isn't over yet -- requiring an entry already logged
        // today would falsely break an intact streak for someone who
        // simply hasn't written today's note yet.
        const result = computeStreak(['2026-09-03', '2026-09-04', '2026-09-05'], '2026-09-06');
        expect(result.currentStreak).toBe(3);
    });

    it('reports a broken streak (current = 0) when the last entry is more than a day old', () => {
        const result = computeStreak(['2026-08-30', '2026-08-31', '2026-09-01'], '2026-09-06');
        expect(result.currentStreak).toBe(0);
        expect(result.longestStreak).toBe(3);
    });

    it('does not let an isolated current-day entry overwrite a longer streak from the past', () => {
        const result = computeStreak(
            ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-09-06'],
            '2026-09-06'
        );
        expect(result.currentStreak).toBe(1);
        expect(result.longestStreak).toBe(5);
        expect(result.longestStreakStart).toBe('2026-08-01');
        expect(result.longestStreakEnd).toBe('2026-08-05');
    });

    it('returns all zeros/nulls for an empty history', () => {
        expect(computeStreak([], '2026-09-06')).toEqual({
            currentStreak: 0,
            longestStreak: 0,
            longestStreakStart: null,
            longestStreakEnd: null,
        });
    });
});

describe('getHeatmapGridStart', () => {
    it('starts the grid on the Sunday on/before the requested window, spanning 53 week columns for a full year', () => {
        const today = new Date(2026, 8, 6);
        const gridStart = getHeatmapGridStart(364, today);
        expect(gridStart.getDay()).toBe(0); // Sunday
    });
});

describe('buildHeatmapGrid', () => {
    it('zero-fills days with no notes rather than omitting them', () => {
        const gridStart = new Date(2026, 8, 1);
        const endDate = new Date(2026, 8, 3);
        const countsByDate = new Map([['2026-09-01', 2]]);
        const result = buildHeatmapGrid(gridStart, endDate, countsByDate);

        const sept2 = result.days.find((d) => d.date === '2026-09-02');
        expect(sept2?.count).toBe(0);
        expect(result.days).toHaveLength(3);
    });

    it('computes maxCount correctly across the whole grid', () => {
        const gridStart = new Date(2026, 8, 1);
        const endDate = new Date(2026, 8, 3);
        const countsByDate = new Map([
            ['2026-09-01', 2],
            ['2026-09-03', 5],
        ]);
        const result = buildHeatmapGrid(gridStart, endDate, countsByDate);
        expect(result.maxCount).toBe(5);
    });

    it('places each day at the correct week column and day-of-week row', () => {
        const gridStart = new Date(2026, 7, 30); // a Sunday
        const endDate = new Date(2026, 8, 6); // the following Sunday
        const result = buildHeatmapGrid(gridStart, endDate, new Map());

        const firstDay = result.days[0];
        expect(firstDay.week).toBe(0);
        expect(firstDay.dayOfWeek).toBe(0);

        const secondSunday = result.days.find((d) => d.date === '2026-09-06');
        expect(secondSunday?.week).toBe(1);
        expect(secondSunday?.dayOfWeek).toBe(0);
    });
});
