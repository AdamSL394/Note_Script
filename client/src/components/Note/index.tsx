import { useState } from 'react';
import Card from '@mui/material/Card/index.js';
import IconButton from '@mui/material/IconButton/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import NoteText from '../NoteText/noteText';
import type { Note as NoteType } from '../../types';
import { WIN_TAGS } from '../../constants/noteFields';
import { getTagColor } from '../../utils/tagColor';
import { formatHumanDate } from '../../utils/date';
import { renderStars } from '../../utils/renderStars';
import { getActiveNoteTags } from '../../utils/resolveNoteTags';
import { sanitizeStarValue } from '../../utils/sanitizeStarValue';

interface NoteProps {
  note: NoteType;
  openModal: (note: NoteType) => void;
  updateNote: (note: NoteType) => void;
  onToggleChecklistItem: (note: NoteType, index: number) => void;
  onRemoveChecklistItem: (note: NoteType, index: number) => void;
  onEditChecklistItemText: (note: NoteType, index: number, text: string) => void;
}

function Note(props: NoteProps) {
    const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');

    const commitChecklistEdit = (index: number) => {
        const trimmed = editingText.trim();
        if (trimmed.length > 0) {
            props.onEditChecklistItemText(props.note, index, trimmed);
        }
        setEditingChecklistIndex(null);
    };

    const editNote = (note: NoteType) => {
        // Stashed BEFORE entering edit mode so a cancel can revert to
        // it. The live notes array gets mutated on every keystroke via
        // setNoteValue, so without this separate snapshot there would
        // be no way to recover the pre-edit content once typing starts.
        sessionStorage.setItem(`${note._id}-original`, JSON.stringify(note));
        const noteToEdit: NoteType = {
            ...note,
            star: sanitizeStarValue(note.star),
            textLength: 200 - note.text.length,
            edit: true,
        };
        sessionStorage.setItem(noteToEdit._id, JSON.stringify(noteToEdit));
        props.updateNote(noteToEdit);
    };

    // 'date/smoosh' isn't a valid identifier, so it has to be read via
    // bracket access — same pattern as NotesHomeView.
    const isWinDay = WIN_TAGS.some((tag) => (props.note.tags ?? []).some((t) => t.name === tag));
    const stars = renderStars(props.note.star);

    return (
        <div className="noteCard">
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
                    <span>{formatHumanDate(props.note.date)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {stars && (
                            <span style={{ color: 'var(--ns-amber)', fontSize: '12px', marginRight: '4px' }}>
                                {stars}
                            </span>
                        )}
                        <Tooltip title="Edit entry">
                            <IconButton
                                size="small"
                                aria-label="Edit note"
                                onClick={() => editNote(props.note)}
                            >
                                <EditOutlinedIcon style={{ fontSize: '14px' }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete entry">
                            <IconButton
                                size="small"
                                aria-label="Delete note"
                                onClick={() => props.openModal(props.note)}
                            >
                                <DeleteOutlineIcon style={{ fontSize: '14px' }} />
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>

                <NoteText note={props.note}></NoteText>

                {(props.note.checklist ?? []).length > 0 && (
                    <div style={{ margin: '0.5rem 0' }}>
                        {(props.note.checklist ?? []).map((item, index) => (
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
                                    onChange={() => props.onToggleChecklistItem(props.note, index)}
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
                                    onClick={() => props.onRemoveChecklistItem(props.note, index)}
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
                    {getActiveNoteTags(props.note).map(({ field, icon, label }) => {
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
        </div>
    );
}

export default Note;
