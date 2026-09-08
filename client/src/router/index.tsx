import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../views/Login/login';
import Home from '../views/Home/home';
import { ProtectedRoute } from '../hooks/protectedRoute';
import AllNotes from '../views/AllNotes/allNotes';
import UserSettings from '../views/UserSettings/userSettings'

// Lazy-loaded specifically because this page pulls in recharts, which
// adds ~100KB gzipped to whatever bundle it's part of -- splitting it
// into its own chunk means that cost is only ever paid by someone who
// actually opens Analytics, not by every page load regardless of
// whether they ever visit it.
const Analytics = lazy(() => import('../views/Analytics/analytics'));

// These four don't pull in anything as heavy as recharts individually,
// so this isn't the same ~100KB-per-route win Analytics was -- but
// each is genuinely infrequently visited (AdminUsers especially: most
// users never see it at all, it's admin-only), so splitting them out
// still means Home/AllNotes/Login -- the pages every user hits on
// every visit -- carry less weight, for a real if more modest gain.
const Upload = lazy(() => import('../views/Upload/upload'));
const AdminUsers = lazy(() => import('../views/AdminUsers/adminUsers'));
const PrivacyPolicy = lazy(() => import('../views/PrivacyPolicy/privacyPolicy'));
const TermsOfService = lazy(() => import('../views/TermsOfService/termsOfService'));

const LoadingFallback = <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

const Router = () => {
    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/privacy"
                    element={<Suspense fallback={LoadingFallback}><PrivacyPolicy /></Suspense>}
                />
                <Route
                    path="/terms"
                    element={<Suspense fallback={LoadingFallback}><TermsOfService /></Suspense>}
                />
                <Route path="/" element={<ProtectedRoute />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/all" element={<AllNotes />} />
                    <Route path="/userSettings" element={<UserSettings />} />
                    <Route
                        path="/analytics"
                        element={
                            <Suspense fallback={LoadingFallback}>
                                <Analytics />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/upload"
                        element={<Suspense fallback={LoadingFallback}><Upload /></Suspense>}
                    />
                    <Route
                        path="/admin/users"
                        element={<Suspense fallback={LoadingFallback}><AdminUsers /></Suspense>}
                    />
                </Route>
            </Routes>
        </>
    );
};

export default Router;