import React from 'react';
import ReactDOM from 'react-dom'; // Change this line
import { StrictMode } from 'react';
import App from './App.jsx';
import './index.css';
import VoiceChat from './App.jsx';

ReactDOM.render(
    <StrictMode>
        <App />
    </StrictMode>,
    document.getElementById('root') // Use this instead of createRoot
);
