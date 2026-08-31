import { useState } from 'react';
import Dialog from '@mui/material/Dialog/index.js';
import DialogTitle from '@mui/material/DialogTitle/index.js';
import DialogContent from '@mui/material/DialogContent/index.js';
import DialogContentText from '@mui/material/DialogContentText/index.js';
import DialogActions from '@mui/material/DialogActions/index.js';
import TextField from '@mui/material/TextField/index.js';
import Button from '@mui/material/Button/index.js';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  errorMessage?: string;
}

const CONFIRM_TEXT = 'DELETE';

const DeleteAccountDialog = ({
  open,
  onClose,
  onConfirm,
  isDeleting,
  errorMessage,
}: DeleteAccountDialogProps) => {
  const [confirmInput, setConfirmInput] = useState('');

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmInput('');
    onClose();
  };

  const canConfirm = confirmInput === CONFIRM_TEXT && !isDeleting;

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Delete your account</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This permanently deletes your account and every note you have ever
          written. This cannot be undone.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          fullWidth
          variant="outlined"
          label={`Type ${CONFIRM_TEXT} to confirm`}
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          disabled={isDeleting}
        />
        {errorMessage && (
          <DialogContentText color="error" sx={{ marginTop: '0.5rem' }}>
            {errorMessage}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!canConfirm}
          color="error"
          variant="contained"
        >
          {isDeleting ? 'Deleting…' : 'Delete my account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAccountDialog;
