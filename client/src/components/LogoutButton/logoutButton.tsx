import { useAuth0 } from '@auth0/auth0-react';
import IconButton from '@mui/material/IconButton/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
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
        <Tooltip title="Sign out">
            <IconButton
                onClick={() => logouts()}
                className="logoutButton"
                aria-label="Sign out"
                size="small"
            >
                <LogoutOutlinedIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};

export default LogOut;
