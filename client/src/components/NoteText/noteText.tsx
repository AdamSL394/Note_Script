import type { Note } from '../../types';

interface NoteTextProps {
  note: Note;
}

function NoteText({ note }: NoteTextProps) {
    return (
        <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1.1rem' }}>
      {note.text.split('\n').map((line, key) => {
        if (line.trim() === '') {
          return null; 
        }
        const formattedLine = line.charAt(0).toUpperCase() + line.slice(1);
        return (
          <li
            key={key}
            style={{
              padding: '3px 0',
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--ns-ink)',
            }}
          >
            {formattedLine}
          </li>
        );
      })}
    </ul>
    );
}
export default NoteText;