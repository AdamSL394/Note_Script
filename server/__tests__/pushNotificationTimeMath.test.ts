import { computeUserLocalTime } from '../controller/pushController';

describe('computeUserLocalTime', () => {
    it('computes local hour and date for a timezone behind UTC (EST)', () => {
        // EST is UTC-5, so getTimezoneOffset() returns +300 (minutes to
        // add to local time to reach UTC).
        const result = computeUserLocalTime(new Date('2026-09-06T20:00:00Z'), 300);
        expect(result).toEqual({ hour: 15, dateString: '2026-09-06' });
    });

    it('computes local hour and date for a timezone ahead of UTC (Japan)', () => {
        // Japan is UTC+9, so getTimezoneOffset() returns -540.
        const result = computeUserLocalTime(new Date('2026-09-06T20:00:00Z'), -540);
        expect(result).toEqual({ hour: 5, dateString: '2026-09-07' });
    });

    it('rolls the date back correctly when local time falls on the previous UTC day', () => {
        // EST user at 02:00 UTC is actually 21:00 the PREVIOUS day in
        // their own local time -- the trickiest case, since it crosses
        // a date boundary in the opposite direction from the Japan case.
        const result = computeUserLocalTime(new Date('2026-09-06T02:00:00Z'), 300);
        expect(result).toEqual({ hour: 21, dateString: '2026-09-05' });
    });

    it('returns the same time for UTC itself (zero offset)', () => {
        const result = computeUserLocalTime(new Date('2026-09-06T14:00:00Z'), 0);
        expect(result).toEqual({ hour: 14, dateString: '2026-09-06' });
    });
});
