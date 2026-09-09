import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Navbar from '../components/Navbar/navbar';

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth0();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    return (
        <>
            <Navbar />
            <Outlet/>
        </>
    );
};