// Every boolean field on a Note that can be tagged, with its emoji and
// accessible label. Both NoteCard (which field → what to render on a
// card) and HomeView (which field → what to count and display in the
// "past week" summary panel) build off this single list, so a field
// added here shows up correctly in both places instead of the two
// drifting out of sync — which is exactly what previously happened:
// HomeView had its own separately hand-typed, differently-cased field
// list that didn't match the real Note field names.
export interface NoteFieldConfig {
    field: string;
    icon: string;
    label: string;
}

export const NOTE_TAG_FIELDS: NoteFieldConfig[] = [
    { field: 'look', icon: '👀', label: 'Eyes' },
    { field: 'gym', icon: '💪🏼', label: 'Arm' },
    { field: 'weed', icon: '🍁', label: 'Leaf' },
    { field: 'code', icon: '👨🏻\u200d💻', label: 'Computer guy' },
    { field: 'read', icon: '📚', label: 'Books' },
    { field: 'eatOut', icon: '🍕', label: 'Pizza' },
    { field: 'basketball', icon: '⛹🏻\u200d♂️', label: 'Basketball' },
    { field: 'king', icon: '🤴🏻', label: 'King' },
    { field: 'medal', icon: '🥇', label: 'Medal' },
    { field: 'date/smoosh', icon: '👫', label: 'Date' },
];

// Tags that count as a "win" day for the streak strip's amber dot.
export const WIN_TAGS = ['medal', 'king'];
