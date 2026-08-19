import React from 'react';
import Card from '@mui/material/Card/index.js';
import Grid from '@mui/material/Grid/index.js';
import type { Note } from '../../types';

interface HomeNotesProps {
  notes: Note[];
}

interface TagConfigEntry {
  field: string;
  icon: string;
  label: string;
}

// Maps each Note field to its emoji + label. One small table + one map
// instead of nine near-identical hand-written conditional blocks - same
// fields, same conditions, same icons rendered, just not copy-pasted
// nine times over.
const TAG_CONFIG: TagConfigEntry[] = [
  { field: 'look', icon: '👀', label: 'Eyes' },
  { field: 'gym', icon: '💪🏼', label: 'arm' },
  { field: 'weed', icon: '🍁', label: 'Leaf' },
  { field: 'code', icon: '👨🏻\u200d💻', label: 'Computer guy' },
  { field: 'read', icon: '📚', label: 'Books' },
  { field: 'eatOut', icon: '🍕', label: 'Pizza' },
  { field: 'basketball', icon: '⛹🏻\u200d♂️', label: 'Basketball' },
  { field: 'king', icon: '🤴🏻', label: 'King' },
  { field: 'medal', icon: '🥇', label: 'Medal' },
  { field: 'date/smoosh', icon: '👫', label: 'Date' },
];

// Same "win" convention as the streak strip and CreateNote's tag chips -
// a card with one of these tags gets the amber accent, so the same
// color means the same thing everywhere in the app.
const WIN_TAGS = new Set(['medal', 'king']);

// Renders a note's star rating ('1'/'2'/'3'/'None', per the schema) as
// filled stars instead of the raw string - "'s: None" read oddly and
// gave no visual sense of scale the way ★★☆ does.
const renderStars = (star: string | undefined) => {
  const count = Number(star);
  if (!star || star === 'None' || Number.isNaN(count) || count < 1) {
    return null;
  }
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count));
};

export const HomeNotes = (props: HomeNotesProps) => {
  const renderNoteCard = (note: Note, i: number) => {
    // 'date/smoosh' isn't a valid identifier, so the schema's own field
    // name has to be read via bracket access - Note is otherwise a
    // strict, fully-named type everywhere else, so this stays a local
    // cast rather than loosening the shared type for one odd field.
    const record = note as unknown as Record<string, unknown>;
    const isWinDay = Array.from(WIN_TAGS).some((tag) => Boolean(record[tag]));
    const stars = renderStars(note.star);

    return (
      <Grid alignItems="flex-start" key={i} item xs={12} sm={6} md={4} lg={3}>
        <Card
          variant="outlined"
          style={{
            marginBottom: '1rem',
            border: '0.5px solid var(--ns-rule)',
            borderLeft: isWinDay
              ? '3px solid var(--ns-amber)'
              : '0.5px solid var(--ns-rule)',
            borderRadius: '14px',
            background: 'var(--ns-paper)',
            boxShadow: '0 1px 3px rgba(35, 38, 43, 0.04)',
            padding: '1.1rem 1.25rem',
          }}
        >
          <div
            style={{
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '0.5px solid var(--ns-rule)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.03em',
              color: 'var(--ns-graphite)',
            }}
          >
            <span>{note.date}</span>
            {stars && (
              <span style={{ color: 'var(--ns-amber)', fontSize: '12px' }}>
                {stars}
              </span>
            )}
          </div>

          {note.text.split('\n').map((line, key) => {
            if (line.length === 0) {
              return null;
            }
            const firstLetter = line[0].toUpperCase();
            const restOfSentence = line.slice(1, line.length);
            return (
              <p
                key={key}
                style={{
                  textAlign: 'left',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--ns-ink)',
                  margin: '0.4rem 0',
                }}
              >
                {firstLetter + restOfSentence}
              </p>
            );
          })}

          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '0.5px solid var(--ns-rule)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {TAG_CONFIG.map(({ field, icon, label }) =>
              record[field] ? (
                <span
                  key={field}
                  role="img"
                  aria-label={label}
                  style={{
                    fontSize: '13px',
                    background: 'var(--ns-fog)',
                    border: '0.5px solid var(--ns-rule)',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    lineHeight: 1.6,
                  }}
                >
                  {icon}
                </span>
              ) : null
            )}
          </div>
        </Card>
      </Grid>
    );
  };

  return <>{props.notes.map((note, i) => renderNoteCard(note, i))}</>;
};