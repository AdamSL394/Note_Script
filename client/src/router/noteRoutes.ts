/* eslint-disable max-len */
import { request, requestJson, requestWithStatus } from './client';
import type { Note, TagSnapshot, TagAnalytics, TagTimeSeries, HeatmapResponse, TagStreak, DayOfWeekPattern, Seasonality, AuthUser, UserRecord } from '../types';

interface PaginatedNotesResponse {
  notes: Note[];
  totalCount: number;
}

interface UpdateNotePayload {
  text: string;
  date: string;
  star: string;
  edit: boolean;
  tags: TagSnapshot[];
  look?: boolean;
  gym?: boolean;
  weed?: boolean;
  code?: boolean;
  read?: boolean;
  eatOut?: boolean;
  basketball?: boolean;
}

const NoteRoutes = {
  deleteNote: (noteId: string) =>
    request(`/notes/delete/${noteId}`, { method: 'DELETE' }),

  getAllNotes: async (
    page: number,
    pageSize: number,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedNotesResponse> => {
    const result = await requestJson<PaginatedNotesResponse>(
      `/notes/all?page=${page}&pageSize=${pageSize}&sort=${sortDirection}`
    );
    return result ?? { notes: [], totalCount: 0 };
  },

  getNoteCount: async (): Promise<number> => {
    const result = await requestJson<{ count: number }>('/notes/count');
    return result?.count ?? 0;
  },

  getTagAnalytics: async (): Promise<TagAnalytics[]> => {
    const result = await requestJson<TagAnalytics[]>('/notes/analytics/tags');
    return result ?? [];
  },

  getTagTimeSeries: async (
    granularity: 'week' | 'month' | 'year',
    count: number
  ): Promise<TagTimeSeries> => {
    const result = await requestJson<TagTimeSeries>(
      `/notes/analytics/timeseries?granularity=${granularity}&count=${count}`
    );
    return result ?? { buckets: [], granularity, series: [] };
  },

  getActivityHeatmap: async (tag?: string): Promise<HeatmapResponse> => {
    const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    const result = await requestJson<HeatmapResponse>(`/notes/analytics/heatmap${query}`);
    return result ?? { days: [], maxCount: 0 };
  },

  getTagStreaks: async (): Promise<TagStreak[]> => {
    const result = await requestJson<TagStreak[]>('/notes/analytics/streaks');
    return result ?? [];
  },

  getTagDayOfWeekPattern: async (): Promise<DayOfWeekPattern> => {
    const result = await requestJson<DayOfWeekPattern>('/notes/analytics/dayofweek');
    return result ?? { dayLabels: [], series: [] };
  },

  getTagSeasonality: async (): Promise<Seasonality> => {
    const result = await requestJson<Seasonality>('/notes/analytics/seasonality');
    return result ?? { monthLabels: [], series: [] };
  },

  getRecentlyUpdatedNotes: async (): Promise<Note[]> => {
    const result = await requestJson<Note[]>('/notes/recentlyUpdated');
    return result ?? [];
  },

  updateNote: (note: Note): Promise<Note | null> =>
    requestJson<Note>(`/notes/update/${note._id}`, {
      method: 'PATCH',
      body: {
        text: note.text,
        date: note.date,
        star: note.star,
        edit: note.edit,
        tags: note.tags ?? [],
      } as UpdateNotePayload,
    }),

  searchNote: async (searchValue: string): Promise<Note[]> => {
    const query = encodeURIComponent(searchValue);
    const result = await requestJson<Note[]>(`/notes/search/${query}`);
    return result ?? [];
  },

  getNotesOrdered: async (): Promise<Note[]> => {
    const orderedNotes = await requestJson<Note[]>('/notes/all/order');
    if (!orderedNotes || orderedNotes.length < 1) {
      return [];
    }
    return orderedNotes;
  },

  getNote: (noteId: string): Promise<string> => request(`/notes/note/${noteId}`),

  getNoteRange: async (
    start: string,
    end: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Note[] | undefined> => {
    const text = await request('/notes/noterange', {
      method: 'POST',
      body: { start, end, sort: sortDirection },
    });
    if (text.length > 0) {
      return JSON.parse(text) as Note[];
    }
    return undefined;
  },

  uploadNotes: (value: string, userId: string): Promise<string> =>
    request('/notes/upload', {
      method: 'POST',
      body: { userId, note: value },
    }),

  getNoteRangeYear: (
    tdYearAgo: string,
    lwYearAgo: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Note[] | null> =>
    requestJson<Note[]>(`/notes/lastyear/${tdYearAgo}/${lwYearAgo}?sort=${sortDirection}`),

  getUserInfomation: (user: AuthUser): Promise<string> => {
    if (!user.sub) return Promise.resolve('');
    return request('/api/users/user', {
      method: 'POST',
      body: { user },
    });
  },

  getAllUsers: async (): Promise<UserRecord[] | null> => {
    return requestJson<UserRecord[]>('/api/users/admin/users');
  },

  deleteAccount: async (): Promise<boolean> => {
    const { ok } = await requestWithStatus('/api/users/user', { method: 'DELETE' });
    return ok;
  },

  exportUserData: async (): Promise<boolean> => {
    const data = await requestJson<Record<string, unknown>>('/api/users/user/export');
    if (!data) return false;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `note-script-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  },

  postNote: (raw: Record<string, unknown>): Promise<string> =>
    request('/notes/note', { method: 'POST', body: raw }),

  postUserStats: (user: AuthUser, trackedStat: unknown): Promise<string> => {
    if (!user.sub) return Promise.resolve('');
    return request('/api/users/user/trackedstats', {
      method: 'POST',
      body: { user, trackedStats: trackedStat },
    });
  },

  getNoteYears: (): Promise<string> =>
    request('/notes/aggregateNoteyears', { method: 'POST' }),
};

export default NoteRoutes;