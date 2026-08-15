import { useAuth0 } from '@auth0/auth0-react';
import Button from '@mui/material/Button/index.js';
import React from 'react';

const LoginButton = (): React.ReactElement | null => {
    const { loginWithRedirect, isAuthenticated } = useAuth0();

    const buttonStyle: React.CSSProperties = {
        color: '#000000',
        float: 'right',
        background: '#e9d8c2',
        margin: '.5%',
        font: '300 normal 1.5em \'tahoma\'',
        fontFamily: 'Times, Times New Roman, serif',
      };

    if (isAuthenticated) {
        return null;
    }

    return (
        <Button
            onClick={() => loginWithRedirect()}
            style={buttonStyle}>
            Sign In
        </Button>
    );
};

export default LoginButton;