import React from 'react';
import ReactDOM from 'react-dom';  // Không dùng 'react-dom/client' cho React 16
import App from './App';
import './index.css';  // File chứa Tailwind directives
import VoiceChat from './VoiceChat';

ReactDOM.render(
  <React.StrictMode>
    <VoiceChat />
  </React.StrictMode>,
  document.getElementById('root')
);
