// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoCallApp from './VideoCallApp';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => (
    <Router >
        <ErrorBoundary>
            <Routes>
                <Route path="/call/:userId/:companyId" element={<VideoCallApp />} />
                <Route path="/" element={<div>hello</div>} />
            </Routes>
        </ErrorBoundary>
    </Router>
);

export default App;
