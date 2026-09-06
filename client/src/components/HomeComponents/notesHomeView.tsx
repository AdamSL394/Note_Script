import Card from '@mui/material/Card/index.js';
import Grid from '@mui/material/Grid/index.js';
import IconButton from '@mui/material/IconButton/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
}

interface HomeNoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
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
        <span>{formatHumanDate(note.date)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
        <HomeNoteCard note={note} onEdit={props.onEdit} onDelete={props.onDelete} />
      </Grid>
    ))}
  </>
);