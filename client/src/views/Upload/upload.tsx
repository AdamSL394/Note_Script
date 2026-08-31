/* eslint-disable max-len */
import React, { useState } from 'react';
import Navbar from '../../components/Navbar/navbar';
import Container from '@mui/material/Container/index.js';
import { useAuth0 } from '@auth0/auth0-react';
import Card from '@mui/material/Card/index.js';
import Button from '@mui/material/Button/index.js';
import Grid from '@mui/material/Grid/index.js';
import NoteRoutes from '../../router/noteRoutes';
import './upload.css';

interface PreviewNote {
  date: string;
  text: string;
  star: string;
}

const EXAMPLE_FILE = `11/19/21
    Nose Piercing
    Bryce Ronak Show up
    Get a table super drunk
    
    
    11/20/21
    Sleep most the day 
    Drinks strip of bars
    Drop phone crack screen
    Whore house no hot girls
    
    
    11/21/21
    Drop bags at Bryce/Ronaks
    Chill at beach get coffee
    Check into hostel
    Meet up with kazakhstan girl
    Ronak smooshed in bathroom`;

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
        note.date = noteDate.toISOString().split('T')[0];
        i++;
      }

      while (notes[i] !== '\n' && notes[i] !== undefined && i < notes.length) {
        if (notes[i] === '\r' || notes[i].length === 0) {
          if (
            i + 1 < notes.length &&
            (notes[i + 1] === '\r' || notes[i + 1].length === 0)
          ) {
            while (notes[i + 1] === '\r' || notes[i + 1].length === 0) {
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
    <>
      <Navbar></Navbar>
      <Container id="container">
        <form>
          <input
            type="file"
            id="csvFileInput"
            accept=".csv,.txt"
            onChange={handleOnChange}
          />

          <Button
            onClick={(e) => switchOperation(e, userId)}
            id="upload"
            style={{ marginRight: '3%' }}
          >
            {fileButtontext}
          </Button>

          <Button id="example" onClick={(e) => download(e)}>
            Example .txt File
          </Button>
        </form>

        <Container style={{ paddingBottom: '3%', marginTop: '.5%' }}>
          <Grid
            style={{ width: '90% !important' }}
            container
            spacing={2}
            direction="row"
            justifyContent="center"
            alignItems="flex-start"
          >
            {array.map((note, i) => {
              return (
                <Grid key={i + 100} item xs={12} sm={6} md={4} lg={3}>
                  <Card
                    style={{ marginBottom: '2%' }}
                    id="Card"
                    variant="outlined"
                  >
                    <div
                      style={{
                        marginBottom: '5%',
                        borderBottom: '1px solid var(--ns-rule)',
                      }}
                    >
                      <span style={{ marginRight: '12%' }}>
                        {' '}
                        <strong>{note.date}</strong>
                      </span>
                      <strong>
                        <span>✨</span> &apos;s:&nbsp; {note.star}
                      </strong>
                    </div>
                    {note.text.split('\n').map((line, key) => {
                      if (line.length === 0) {
                        return null;
                      }
                      const firstLetter = line[0].toUpperCase();
                      const restOfSentence = line.slice(1, line.length);
                      return (
                        <ul key={key} style={{ textAlign: 'left' }}>
                          <li style={{ padding: '5px 3px ' }}>
                            {firstLetter + restOfSentence}
                          </li>
                        </ul>
                      );
                    })}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Container>
    </>
  );
};
export default UploadNotes;
