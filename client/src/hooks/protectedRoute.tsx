import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth0();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    return <Outlet/>;
};