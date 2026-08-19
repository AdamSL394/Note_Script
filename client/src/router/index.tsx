import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../views/Login/login';
import Home from '../views/Home/home';
import { ProtectedRoute } from '../hooks/protectedRoute';
import AllNotes from '../views/AllNotes/allNotes';
import UserSettings from '../views/UserSettings/userSettings'
import Upload from '../views/Upload/upload.js'


const Router = () => {
    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/all" element={<AllNotes />} />
                    <Route path="/userSettings" element={<UserSettings />} />
                    <Route path="/upload" element={<Upload />} />
                </Route>
            </Routes>
        </>
    );
};

export default Router;