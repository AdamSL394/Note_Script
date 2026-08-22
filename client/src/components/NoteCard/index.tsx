import React from 'react';
import Card from '@mui/material/Card/index.js';
import { NOTE_TAG_FIELDS, WIN_TAGS as WIN_TAG_LIST } from '../../constants/noteFields';
import type { Note } from '../../types';

export interface NoteCardProps {
  note: Note;
  // Both optional: HomeView's weekly digest renders read-only cards
  // (neither passed), while AllNotes/notes.tsx renders editable cards
  // (both passed). The edit pencil / delete "X" only render when their
  // handler is actually supplied, so the same card works in both places
  // instead of needing two near-identical components.
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

// Renders a note's star rating ('1'/'2'/'3'/'None', per the schema) as
// filled stars instead of the raw string.
const renderStars = (star: string | undefined) => {
  const count = Number(star);
  if (!star || star === 'None' || Number.isNaN(count) || count < 1) {
    return null;
  }
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count));
};

export const NoteCard = ({ note, onEdit, onDelete }: NoteCardProps) => {
  // 'date/smoosh' isn't a valid identifier, so the schema's own field
  // name has to be read via bracket access - Note is otherwise a
  // strict, fully-named type everywhere else, so this stays a local
  // cast rather than loosening the shared type for one odd field.
  const record = note as unknown as Record<string, unknown>;
  const isWinDay = WIN_TAG_LIST.some((tag) => Boolean(record[tag]));
  const stars = renderStars(note.star);

  return (
    <div style={{ minWidth: 0 }}>
      <Card
        variant="outlined"
        style={{
          border: '0.5px solid var(--ns-rule)',
          borderLeft: isWinDay
            ? '3px solid var(--ns-amber)'
            : '0.5px solid var(--ns-rule)',
          borderRadius: '14px',
          background: 'var(--ns-paper)',
          boxShadow: '0 1px 3px rgba(35, 38, 43, 0.04)',
          padding: '1.1rem 1.25rem',
          height: '100%',
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stars && (
              <span style={{ color: 'var(--ns-amber)', fontSize: '12px' }}>
                {stars}
              </span>
            )}
            {onEdit && (
              <span
                role="button"
                aria-label="Edit note"
                onClick={() => onEdit(note)}
                style={{ cursor: 'pointer', color: 'var(--ns-graphite)' }}
              >
                🖊
              </span>
            )}
            {onDelete && (
              <span
                role="button"
                aria-label="Delete note"
                onClick={() => onDelete(note)}
                style={{
                  cursor: 'pointer',
                  color: 'var(--ns-graphite)',
                  fontWeight: 700,
                }}
              >
                ✕
              </span>
            )}
          </span>
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
          {NOTE_TAG_FIELDS.map(({ field, icon, label }) =>
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
    </div>
  );
};
