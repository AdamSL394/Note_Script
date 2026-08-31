import Navbar from '../../components/Navbar/navbar';
import './allNotes.css';
import { NoteHistory } from '../../components/NoteHistory/noteHistory';

const AllNotes = () => {
    return (
        <>
            <Navbar></Navbar>
            <NoteHistory></NoteHistory>
        </>
    );
};
export default AllNotes;
