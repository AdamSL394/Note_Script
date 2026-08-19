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
      {props.successFlag === 'visible' && (
        <Alert
          severity="success"
          style={{
            marginTop: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            borderRadius: '8px',
          }}
          id="successFlag"
        >
          {props.successMessage}
        </Alert>
      )}
      {props.errorFlag === 'visible' && (
        <Alert
          severity="error"
          style={{
            marginTop: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            borderRadius: '8px',
          }}
        >
          {props.errorMessage}
        </Alert>
      )}
    </>
  );
};