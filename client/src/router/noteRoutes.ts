/* eslint-disable max-len */
import { request, requestJson } from './client';
import type { Note, AuthUser } from '../types';

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

export default {
  deleteNote: (noteId: string) =>
    request(`/notes/delete/${noteId}`, { method: 'DELETE' }),

  getAllNotes: async (userid: string): Promise<Note[]> => {
    const result = await requestJson<Note[]>(`/notes/all?id=${userid}`);
    return result ?? [];
  },

  getRecentlyUpdatedNotes: async (userid: string): Promise<Note[]> => {
    const result = await requestJson<Note[]>(
      `/notes/recentlyUpdated/${userid}`
    );
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

  searchNote: async (searchValue: string, userId: string): Promise<Note[]> => {
    const query = encodeURIComponent(searchValue);
    const result = await requestJson<Note[]>(
      `/notes/search/${query}/${userId}`
    );
    return result ?? [];
  },

  getNotesOrdered: async (userId: string): Promise<Note[]> => {
    const orderedNotes = await requestJson<Note[]>(
      `/notes/all/order/${userId}`
    );
    if (!orderedNotes || orderedNotes.length < 1) {
      return [];
    }
    return orderedNotes;
  },

  getNote: (noteId: string): Promise<string> => request(`/notes/note/${noteId}`),

  getNoteRange: async (
    userId: string,
    start: string,
    end: string
  ): Promise<Note[] | undefined> => {
    const text = await request('/notes/noterange', {
      method: 'POST',
      body: { userId, start, end },
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
    userid: string,
    tdYearAgo: string,
    lwYearAgo: string
  ): Promise<Note[] | null> =>
    requestJson<Note[]>(`/notes/lastyear/${userid}/${tdYearAgo}/${lwYearAgo}`),

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
    const userid = user.sub.split('|')[1];
    return request(`/api/users/user/${userid}`, {
      method: 'POST',
      body: { user },
    });
  },

  postNote: (raw: Record<string, unknown>): Promise<string> =>
    request('/notes/note', { method: 'POST', body: raw }),

  postUserStats: (user: AuthUser, trackedStat: unknown): Promise<string> => {
    if (!user.sub) return Promise.resolve('');
    const userid = user.sub.split('|')[1];
    return request(`/api/users/user/trackedstats/${userid}`, {
      method: 'POST',
      body: { user, trackedStats: trackedStat },
    });
  },

  getNoteYears: (id: string): Promise<string> =>
    request('/notes/aggregateNoteyears', { method: 'POST', body: { id } }),
};