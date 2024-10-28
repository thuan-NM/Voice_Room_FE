import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import VideoCallApp from './VideoCallApp';

const App = () => {
    return (
        <Router>
            <div className='!bg-indigo-500'>
                <Routes>
                    <Route path="/call/:userId/:companyId" element={<VideoCallApp />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
