/* eslint-disable max-len */
import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Button from '@mui/material/Button/index.js';
import NoteRoutes from '../../router/noteRoutes';
import { toLocalDateString } from '../../utils/date';
import './upload.css';

interface PreviewNote {
  date: string;
  text: string;
  star: string;
}

const EXAMPLE_FILE = `11/19/21
    Went for a run in the park
    Tried a new coffee shop downtown
    Read a few chapters before bed
    
    
    11/20/21
    Cleaned the apartment
    Cooked dinner with a friend
    Watched a movie
    
    
    11/21/21
    Worked on a side project
    Called family
    Early night, felt good`;

const UploadNotes = () => {
  const [array, setArray] = useState<PreviewNote[]>([]);
  const [file, setFile] = useState<File | undefined>();
  const [isFile, setIsFile] = useState(false);
  const { user } = useAuth0();
  const [fileButtontext, setFileButtontext] = useState('Preview Notes');

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsFile(true);
    setFile(e.target.files?.[0]);
    setFileButtontext('Preview Notes');
    setArray([]);
    e.target.value = '';
  };

  const previewFileTXT = (contents: string) => {
    const notes = contents.split('\n');
    const arrayOfNotes: PreviewNote[] = [];

    let note: PreviewNote = { date: '', text: '', star: 'None' };

    for (let i = 0; i <= notes.length - 1; ) {
      let text = '';

      const noteDate = new Date(notes[i]);
      if (noteDate.toString() !== 'Invalid Date') {
        note.date = toLocalDateString(noteDate);
        i++;
      }

      // Blank separator lines are treated as note boundaries -- but
      // trim() before checking length, not a bare length === 0 check,
      // since a "blank" line that's actually whitespace-only (e.g. an
      // indented example, or a real export with trailing spaces) was
      // never being recognized as blank at all. That meant the parser
      // never broke to start a new note, and just kept appending every
      // subsequent line -- including later date headers -- as content
      // of the first note.
      while (notes[i] !== '\n' && notes[i] !== undefined && i < notes.length) {
        if (notes[i] === '\r' || notes[i].trim().length === 0) {
          if (
            i + 1 < notes.length &&
            (notes[i + 1] === '\r' || notes[i + 1].trim().length === 0)
          ) {
            while (notes[i + 1] === '\r' || notes[i + 1].trim().length === 0) {
              i++;
            }
          }
          if (text.length > 0) {
            note.text = text.trim();
            break;
          }
          i++;
        }
        text = text + '\n' + notes[i];
        i++;
      }

      if (text.length > 0) {
        note.text = text.trim();
      }
      arrayOfNotes.push(note);
      note = { date: '', text: '', star: 'None' };
      i++;
    }
    setArray(arrayOfNotes);
    setFileButtontext('Import Notes');
  };

  // Sends the raw file text straight through. Previously this wrapped
  // the text in an extra { note, filetype } object before handing it to
  // NoteRoutes.uploadNotes — which itself wraps its argument in another
  // { note: value } body — so the server ultimately received
  // `note: { note: <text>, filetype: '.txt' }` instead of a plain
  // string, and parseNotes' `.split('\n')` call would throw on that
  // object. Passing the string directly matches what the server
  // actually expects.
  const storeNewNote = async (rawText: string, userId: string) => {
    await NoteRoutes.uploadNotes(rawText, userId);
    setFileButtontext('Preview Notes');
  };

  const handleOnSubmit = (userId: string) => {
    if (!isFile || !file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvOutput = event.target?.result;
      if (typeof csvOutput !== 'string' || csvOutput.length === 0) {
        return;
      }
      storeNewNote(csvOutput, userId);
    };
    reader.readAsText(file);
  };

  const switchOperation = (
    e: React.MouseEvent<HTMLButtonElement>,
    userId: string
  ) => {
    e.preventDefault();
    setArray([]);
    if (fileButtontext === 'Import Notes') {
      handleOnSubmit(userId);
      return;
    }
    if (isFile && file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvOutput = event.target?.result;
        if (typeof csvOutput === 'string') {
          previewFileTXT(csvOutput);
        }
      };
      reader.readAsText(file);
    }
  };

  const download = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const blob = new Blob([EXAMPLE_FILE], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'example-notes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  // Auth0's `user` is undefined until authentication resolves. Guarding
  // here (after the hooks above, per the Rules of Hooks) instead of
  // reading `user.sub` unconditionally, which previously threw if this
  // component ever rendered before auth settled.
  if (!user?.sub) {
    return null;
  }
  const userId = user.sub.split('|')[1];

  return (
    <div className="uploadPage">
      <div className="uploadCard">
        <p className="uploadEyebrow">Import</p>
        <h1 className="uploadHeading">Upload notes</h1>
        <p className="uploadIntro">
          Bring in notes from a .txt or .csv file -- each date starts a new note, with the lines
          underneath as its content.
        </p>

        <form className="uploadForm">
          <label className="uploadFileLabel" htmlFor="csvFileInput">
            <span className="uploadFileLabelText">
              {file ? file.name : 'Choose a file'}
            </span>
            <span className="uploadFileLabelButton">Browse</span>
          </label>
          <input
            type="file"
            id="csvFileInput"
            className="uploadFileInput"
            accept=".csv,.txt"
            onChange={handleOnChange}
          />

          <div className="uploadActions">
            <Button
              variant="contained"
              onClick={(e) => switchOperation(e, userId)}
              disabled={!isFile}
            >
              {fileButtontext}
            </Button>

            <Button variant="outlined" onClick={(e) => download(e)}>
              Example .txt file
            </Button>
          </div>
        </form>

        {array.length > 0 && (
          <div className="uploadPreview">
            <p className="uploadPreviewLabel">Preview ({array.length})</p>
            <div className="uploadPreviewGrid">
              {array.map((note, i) => (
                <div className="uploadPreviewCard" key={i + 100}>
                  <div className="uploadPreviewCardHeader">
                    <strong>{note.date}</strong>
                  </div>
                  <ul className="uploadPreviewCardList">
                    {note.text.split('\n').map((line, key) => {
                      if (line.length === 0) {
                        return null;
                      }
                      const firstLetter = line[0].toUpperCase();
                      const restOfSentence = line.slice(1, line.length);
                      return <li key={key}>{firstLetter + restOfSentence}</li>;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default UploadNotes;
