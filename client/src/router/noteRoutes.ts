/* eslint-disable max-len */
import { request, requestJson } from './client';
import type { Note, AuthUser, UserRecord } from '../types';

interface PaginatedNotesResponse {
  notes: Note[];
  totalCount: number;
}

interface UpdateNotePayload {
  text: string;
  date: string;
  star: string;
  edit: boolean;
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
    pageSize: number
  ): Promise<PaginatedNotesResponse> => {
    const result = await requestJson<PaginatedNotesResponse>(
      `/notes/all?page=${page}&pageSize=${pageSize}`
    );
    return result ?? { notes: [], totalCount: 0 };
  },

  getNoteCount: async (): Promise<number> => {
    const result = await requestJson<{ count: number }>('/notes/count');
    return result?.count ?? 0;
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
        look: note.look || false,
        gym: note.gym || false,
        weed: note.weed || false,
        code: note.code || false,
        read: note.read || false,
        eatOut: note.eatOut || false,
        basketball: note.basketball || false,
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
    end: string
  ): Promise<Note[] | undefined> => {
    const text = await request('/notes/noterange', {
      method: 'POST',
      body: { start, end },
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
    lwYearAgo: string
  ): Promise<Note[] | null> =>
    requestJson<Note[]>(`/notes/lastyear/${tdYearAgo}/${lwYearAgo}`),

  Leetcode_stats: async (): Promise<unknown> => {
    try {
      const response = await fetch(
        'https://leetcode-stats-api.herokuapp.com/adamsl394'
      );
      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      console.log(error);
      return null;
    }
  },

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