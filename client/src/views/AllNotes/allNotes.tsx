import React from 'react';
import Navbar from '../../components/Navbar/nav';
import './allNotes.css';
import { NoteHistory } from '../../components/NoteHistory/entireNoteHistory.js';

const AllNotes = () => {
    return (
        <>
            <Navbar></Navbar>
            <NoteHistory></NoteHistory>
        </>
    );
};
export default AllNotes;
