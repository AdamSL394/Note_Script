import Dialog from '@mui/material/Dialog/index.js';
import DialogTitle from '@mui/material/DialogTitle/index.js';
import DialogContent from '@mui/material/DialogContent/index.js';
import DialogContentText from '@mui/material/DialogContentText/index.js';
import DialogActions from '@mui/material/DialogActions/index.js';
import Button from '@mui/material/Button/index.js';
import type { Note } from '../../types';

interface ModalPopProps {
  // Passed in from notes.tsx but never actually read inside this
  // component — kept in the type to match reality rather than hiding
  // it, but worth knowing it's dead weight if you ever touch this file.
  note?: Note[];
  open: boolean;
  modelNoteId: string | undefined;
  // Receives the note's _id (a string) to delete, or the literal
  // 'Cancel' — never a full Note object. See notes.tsx's openModal,
  // which only ever stores note._id in modelNoteId.
  closeModal: (note: string | 'Cancel') => void;
}

function ModalPop(props: ModalPopProps) {
  const { open, closeModal, modelNoteId } = props;

  const handleDelete = () => {
    if (modelNoteId) {
      closeModal(modelNoteId);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => closeModal('Cancel')}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontSize: '20px', paddingTop: '1.5rem' }}>
        Delete this entry?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: '15px' }}>
          This can&apos;t be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ padding: '0 1.5rem 1.5rem' }}>
        <Button onClick={() => closeModal('Cancel')}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModalPop;
