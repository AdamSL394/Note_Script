import React from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
    <Modal
      open={open}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
    >
      <Box className="style" style={boxStyles}>
        <div style={titleStyles}>Would you like to:</div>
        <Button style={buttonStyles} className="closeButton" onClick={() => closeModal('Cancel')}>
          Close
        </Button>
        <Button style={buttonStyles} className="closeButton" onClick={handleDelete}>
          Delete
        </Button>
      </Box>
    </Modal>
  );
}

const boxStyles: React.CSSProperties = {
  fontWeight: 'bold',
  marginTop: '4%',
};

const titleStyles: React.CSSProperties = {
  fontWeight: 'bold',
};

const buttonStyles: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '1.2em',
};

export default ModalPop;