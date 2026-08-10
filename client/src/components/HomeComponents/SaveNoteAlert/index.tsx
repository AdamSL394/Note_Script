import React from 'react';
import Alert from '@mui/material/Alert/index.js';

interface AlertMessageProps {
  successFlag: 'visible' | 'hidden';
  errorFlag: 'visible' | 'hidden';
  successMessage: string;
  errorMessage: string;
}

export const AlertMessage = (props: AlertMessageProps) => {
  return (
    <>
      <Alert
        severity="success"
        style={{ visibility: props.successFlag, marginTop: '1%' }}
        id="successFlag"
        open={false}
      >
        {props.successMessage}
      </Alert>
      <Alert severity="error" style={{ visibility: props.errorFlag }} open={false}>
        {props.errorMessage}
      </Alert>
    </>
  );
};