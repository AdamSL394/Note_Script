import { useState } from 'react';
import Card from '@mui/material/Card/index.js';
import Grid from '@mui/material/Grid/index.js';
import IconButton from '@mui/material/IconButton/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import type { Note } from '../../types';
import { WIN_TAGS } from '../../constants/noteFields';
import { getTagColor } from '../../utils/tagColor';
import { formatHumanDate } from '../../utils/date';
import { renderStars } from '../../utils/renderStars';
import { getActiveNoteTags } from '../../utils/resolveNoteTags';

interface HomeNotesProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onToggleChecklistItem: (note: Note, index: number) => void;
  onRemoveChecklistItem: (note: Note, index: number) => void;
  onEditChecklistItemText: (note: Note, index: number, text: string) => void;
}

interface HomeNoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onToggleChecklistItem: (note: Note, index: number) => void;
  onRemoveChecklistItem: (note: Note, index: number) => void;
  onEditChecklistItemText: (note: Note, index: number, text: string) => void;
}

// A single card. Exported on its own (not just as part of the list
// wrapper below) so the caller can map over its own notes array in
// original order, swapping this in per-note -- rendering all editing
// notes as one group and all read-only notes as a separate group
// (the previous approach) pulls whichever note you're editing out of
// its natural grid position to the very front, every time.
export const HomeNoteCard = (props: HomeNoteCardProps) => {
  const { note, onEdit, onDelete } = props;
  const isWinDay = WIN_TAGS.some((tag) => (note.tags ?? []).some((t) => t.name === tag));
  const stars = renderStars(note.star);
  const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const commitChecklistEdit = (index: number) => {
    const trimmed = editingText.trim();
    if (trimmed.length > 0) {
      props.onEditChecklistItemText(note, index, trimmed);
    }
    setEditingChecklistIndex(null);
  };

  return (
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
        <span style={{ whiteSpace: 'nowrap' }}>{formatHumanDate(note.date)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {stars && (
            <span style={{ color: 'var(--ns-amber)', fontSize: '12px', marginRight: '4px' }}>
              {stars}
            </span>
          )}
          <Tooltip title="Edit entry">
            <IconButton size="small" aria-label="Edit note" onClick={() => onEdit(note)}>
              <EditOutlinedIcon style={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete entry">
            <IconButton size="small" aria-label="Delete note" onClick={() => onDelete(note)}>
              <DeleteOutlineIcon style={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>
        </div>
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

      {(note.checklist ?? []).length > 0 && (
        <div style={{ margin: '0.5rem 0' }}>
          {(note.checklist ?? []).map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '2px 0',
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => props.onToggleChecklistItem(note, index)}
                aria-label={`Mark "${item.text}" as done`}
                style={{ flexShrink: 0, cursor: 'pointer' }}
              />
              {editingChecklistIndex === index ? (
                <input
                  type="text"
                  autoFocus
                  value={editingText}
                  maxLength={200}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => commitChecklistEdit(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitChecklistEdit(index);
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'var(--font-serif)',
                    fontSize: '14px',
                    border: '0.5px solid var(--ns-blue)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                  }}
                />
              ) : (
                <span
                  onClick={() => {
                    setEditingChecklistIndex(index);
                    setEditingText(item.text);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'var(--font-serif)',
                    fontSize: '14px',
                    color: item.checked ? 'var(--ns-graphite)' : 'var(--ns-ink)',
                    textDecoration: item.checked ? 'line-through' : 'none',
                    cursor: 'text',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.text}
                </span>
              )}
              <IconButton
                size="small"
                aria-label="Remove checklist item"
                onClick={() => props.onRemoveChecklistItem(note, index)}
                style={{ flexShrink: 0, opacity: 0.6 }}
              >
                <CloseIcon style={{ fontSize: '14px' }} />
              </IconButton>
            </div>
          ))}
        </div>
      )}

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
        {getActiveNoteTags(note).map(({ field, icon, label }) => {
          const isWin = WIN_TAGS.includes(field);
          const tagColor = isWin
            ? { background: 'var(--ns-amber-tint)', text: 'var(--ns-amber-dark)' }
            : getTagColor(field);
          return (
            <span
              key={field}
              role="img"
              aria-label={label}
              style={{
                fontSize: '13px',
                background: tagColor.background,
                color: tagColor.text,
                borderRadius: '20px',
                padding: '2px 8px',
                lineHeight: 1.6,
              }}
            >
              {icon}
            </span>
          );
        })}
      </div>
    </Card>
  );
};

export const HomeNotes = (props: HomeNotesProps) => (
  <>
    {props.notes.map((note, i) => (
      <Grid alignItems="flex-start" key={i} item xs={12} sm={6} md={4} lg={3}>
        <HomeNoteCard
          note={note}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onToggleChecklistItem={props.onToggleChecklistItem}
          onRemoveChecklistItem={props.onRemoveChecklistItem}
          onEditChecklistItemText={props.onEditChecklistItemText}
        />
      </Grid>
    ))}
  </>
);