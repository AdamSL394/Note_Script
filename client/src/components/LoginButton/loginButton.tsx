import { useAuth0 } from '@auth0/auth0-react';
import Button from '@mui/material/Button/index.js';
import React from 'react';

const LoginButton = (): React.ReactElement | null => {
    const { loginWithRedirect, isAuthenticated } = useAuth0();

    if (isAuthenticated) {
        return null;
    }

    return (
        <Button
            onClick={() => loginWithRedirect()}
            variant="outlined"
            sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                letterSpacing: '0.03em',
                color: 'var(--ns-blue)',
                borderColor: 'var(--ns-blue)',
                '&:hover': {
                    borderColor: 'var(--ns-blue)',
                    backgroundColor: 'var(--ns-blue-tint)',
                },
            }}
        >
            sign in
        </Button>
    );
};

export default LoginButton;