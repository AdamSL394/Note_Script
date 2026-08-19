import { useAuth0 } from '@auth0/auth0-react';
import Button from '@mui/material/Button/index.js';
import React from 'react';
import './logoutButton.css';


const LogOut = (): React.ReactElement | null => {
    const { logout, isAuthenticated } = useAuth0();

    // Was `logouts = (options) => {...}` — options was never used and
    // logouts() is always called with zero arguments, so the parameter
    // was dead.
    const logouts = () => {
        return logout({
            returnTo: window.location.origin,
        });
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Button
            onClick={() => logouts()}
            className='logoutButton'
        >
            sign out
        </Button>
    );
};

export default LogOut;