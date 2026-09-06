import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../views/Login/login';
import Home from '../views/Home/home';
import { ProtectedRoute } from '../hooks/protectedRoute';
import AllNotes from '../views/AllNotes/allNotes';
import UserSettings from '../views/UserSettings/userSettings'
import Upload from '../views/Upload/upload'
import AdminUsers from '../views/AdminUsers/adminUsers'
import PrivacyPolicy from '../views/PrivacyPolicy/privacyPolicy'
import TermsOfService from '../views/TermsOfService/termsOfService'

// Lazy-loaded specifically because this page pulls in recharts, which
// adds ~100KB gzipped to whatever bundle it's part of -- splitting it
// into its own chunk means that cost is only ever paid by someone who
// actually opens Analytics, not by every page load regardless of
// whether they ever visit it.
const Analytics = lazy(() => import('../views/Analytics/analytics'));


const Router = () => {
    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/" element={<ProtectedRoute />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/all" element={<AllNotes />} />
                    <Route path="/userSettings" element={<UserSettings />} />
                    <Route
                        path="/analytics"
                        element={
                            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                                <Analytics />
                            </Suspense>
                        }
                    />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                </Route>
            </Routes>
        </>
    );
};

export default Router;