/* eslint-disable no-unused-vars */
/* eslint-disable max-len */

import { useAuth0 } from '@auth0/auth0-react';
import { Container } from '@mui/material';
import Pagination from '@mui/material/Pagination/index.js';
import Stack from '@mui/material/Stack/index.js';
import { Box } from '@mui/system';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes.js';
import EditingNote from '../EditNote/editingNote.js';
import ModalPop from '../Modal/index.js';
import Note from '../Note/index.js';
import { SearchNotes } from '../SearchNotes/searchNotes.js';
import './notes.css';

function Notes(props) {
  const postPerPage = 30;
  let [currentPage, setCurrentPage] = useState(1);
  const [notes, setNotes] = useState([]);
  const { user } = useAuth0();
  const [currentCall, setCurrentCall] = useState('All');
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [open, setOpen] = useState(false);
  const [modelNoteId, setModelNoteId] = useState();
  const [isloading, setIsLoading] = useState(false);
  const [searchedNotesResults, setSearchNoteResults] = useState([]);
  const [dateaRangeNotesResults, setDateaRangeNoteResults] = useState();
  const [noNotes, setNoNotes] = useState();

  useEffect(() => {
    allNotes(1);
  }, []);

  const slicePosts = (getNotes, value) => {
    if (value) {
      currentPage = value;
      setCurrentPage(value);
    }
    const indexOfLastPost = currentPage * postPerPage;
    const indexOfFirstPost = indexOfLastPost - postPerPage;
    const currentPosts = getNotes.slice(indexOfFirstPost, indexOfLastPost);
    return currentPosts;
  };

  const saveNote = (note, value) => {
    const updatedNote = JSON.parse(sessionStorage.getItem(note._id));
    if (updatedNote != null) {
      updatedNote.edit = false;
      note.edit = false;
      sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
      updateNote(updatedNote);
    } else {
      note.edit = false;
      sessionStorage.setItem(note._id, JSON.stringify(note));
      updateNote(note);
    }
  };

  const getNoteYears = async (year, value) => {
    setIsLoading(true);
    const userid = user.sub.split('|')[1];
    const noteYears = await NoteRoutes.getNoteRangeYear(
      userid,
      year + '-12-' + '31',
      year + '-01-' + '01'
    );
    if (!checkNoteApiResponse(noteYears)) {
      return;
    }
    setIsLoading(false);
    const currentPosts = slicePosts(noteYears, value);
    setNotes(currentPosts);
    setNumberOfPages(Math.ceil(noteYears.length / postPerPage));
  };

  const setNotesBasedOnYear = async (_, year) => {
    setCurrentPage(1);
    await determineApiCall(year, 1);
  };

  const allNotes = async (value) => {
    setIsLoading(true);
    const userid = user.sub.split('|')[1];
    const getNotes = await NoteRoutes.getAllNotes(userid);

    if (!checkNoteApiResponse(getNotes)) {
      return;
    }
    setIsLoading(false);
    setCurrentPage(value);
    if (value) {
      currentPage = value;
    }
    const currentPosts = slicePosts(getNotes, currentPage);
    setNotes(currentPosts);
    setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
    return;
  };

  const handleChange = async (e, value) => {
    setCurrentPage(value);
    await determineApiCall(currentCall, value);
  };

  const openModal = (note) => {
    setModelNoteId(note._id);
    setOpen(true);
  };

  const closeModal = async (note) => {
    if (note !== 'Cancel') {
      setOpen(false);
      await NoteRoutes.deleteNote(note);
      allNotes(currentPage);
    }
    if (note === 'Cancel') {
      setOpen(false);
    }
  };

  const updateNote = async (note) => {
    const getNotes = await NoteRoutes.updateNote(note);
    if (!checkNoteApiResponse(getNotes)) {
      return;
    }
    const updatedNotes = notes.map((note) => {
      return note;
    });
    setNotes(updatedNotes);
  };

  const getNoteRange = async (userId, start, end) => {
    if (start > end) {
      return;
    }
    if (!start || !end) {
      return;
    }
    setIsLoading(true);
    const noteDateRange = await NoteRoutes.getNoteRange(userId, start, end);
    setIsLoading(false);
    setDateaRangeNoteResults(noteDateRange);
    if (noteDateRange.length < 30) {
      currentPage = 1;
    }
    setCurrentCall('Date Range');
    const currentPosts = slicePosts(noteDateRange, 1);
    setNumberOfPages(Math.ceil(noteDateRange.length / postPerPage));
    setNotes(currentPosts);
  };

  const checkNoteApiResponse = (notes) => {
    if (notes.length < 1) {
      let noNotesElement = document.getElementById('noNotes');
      noNotesElement.style.display = "grid"
      setNoNotes('Get started... Upload or make your first Note!');
      setIsLoading(false);
      setNotes([]);
      return false;
    } else {
      let noNotesElement = document.getElementById('noNotes');
      noNotesElement.style.display = "none"
      setNoNotes('Get started... Upload or make your first Note!');
      setNoNotes('');
      return true;
    }
  };

  const determineApiCall = async (stringApiCall, value) => {
    switch (stringApiCall) {
      case 'All': {
        const userid = user.sub.split('|')[1];
        setCurrentCall('All');
        setIsLoading(true);
        const getNotes = await NoteRoutes.getAllNotes(userid);
        if (!checkNoteApiResponse(getNotes)) {
          return;
        }
        setIsLoading(false);
        const currentPosts = slicePosts(getNotes, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
        break;
      }
      case 'Recently Changed': {
        const userid = user.sub.split('|')[1];
        setCurrentCall('Recently Changed');
        setIsLoading(true);
        const getNotes = await NoteRoutes.getRecentlyUpdatedNotes(userid);
        if (!checkNoteApiResponse(getNotes)) {
          return;
        }
        setIsLoading(false);
        const currentPosts = slicePosts(getNotes, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
        break;
      }
      case 'Search': {
        const currentPosts = slicePosts(searchedNotesResults, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(searchedNotesResults.length / postPerPage));
        break;
      }
      case 'Date Range': {
        const currentPosts = slicePosts(dateaRangeNotesResults, value);
        setNotes(currentPosts);
        setNumberOfPages(
          Math.ceil(dateaRangeNotesResults.length / postPerPage)
        );
        break;
      }
      default: {
        setCurrentCall(stringApiCall);
        getNoteYears(stringApiCall, value);
        break;
      }
    }
  };

  const setNoteValue = () => {
    setNotes([...notes]);
  };

  const setSearchedNote = (notes) => {
    setNotes(notes);
  };

  const setDateNote = (e, note) => {
    const storedNote = JSON.parse(sessionStorage.getItem(note._id))
    if(storedNote){
    }
    note['date'] = e.target.value
    sessionStorage.setItem(note._id, JSON.stringify(note));
    setNotes([...notes]);
  }

  return (
    <>
      <ModalPop
        note={notes}
        open={open}
        modelNoteId={modelNoteId}
        closeModal={closeModal}
      ></ModalPop>
      <Container style={{ maxWidth: '100%', marginBottom: '1rem' }}>
        <Box id='searchStyle' style={{ maxWidth: '90%'}}>
          <SearchNotes
            setCurrentPage={setCurrentPage}
            getNoteRange={getNoteRange}
            setCurrentCall={setCurrentCall}
            slicePosts={slicePosts}
            setSearchNoteResults={setSearchNoteResults}
            setNumberOfPages={setNumberOfPages}
            setSearchedNote={setSearchedNote}
            currentPage={currentPage}
            setNotesBasedOnYear={setNotesBasedOnYear}
          ></SearchNotes>
        </Box>
        <Stack className="stack">
          <Pagination
            page={currentPage}
            count={numberOfPages}
            onChange={handleChange}
            defaultPage={1}
            color="primary"
          ></Pagination>
        </Stack>
      </Container>
      <Box id="noNotes">{noNotes}</Box>
      {isloading ? (
        <img
          src="https://media4.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif?cid=ecf05e47d78qz3v8umwss2cvzhgxw5siyk2sxf88n7leuzne&rid=giphy.gif&ct=g"
          alt="Loading Gif"
        />
      ) : (
        <>
          {notes.map((note, i) => {
            if (!note.edit) {
              return (
                <Note
                  key={i}
                  note={note}
                  openModal={openModal}
                  updateNote={updateNote}
                ></Note>
              );
            }
            if (note.edit) {
              if (note.textLength === undefined) {
                note.textLength = 200 - note.text.length;
              }
              return (
                <EditingNote
                  key={i * 102}
                  notes={notes}
                  note={note}
                  setDateNote={setDateNote}
                  currentPage={currentPage}
                  setNoteValue={setNoteValue}
                  saveNote={saveNote}
                  openModal={openModal}
                  updateNote={updateNote}
                  onStarValueChange={props.onStarValueChange}
                ></EditingNote>
              );
            }
          })}
        </>
      )}
    </>
  );
}

export default Notes;

Notes.propTypes = {
  onStarValueChange: PropTypes.func,
  setNoNotes: PropTypes.func,
};
