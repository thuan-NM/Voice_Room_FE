import React from 'react';
import ReactDOM from 'react-dom';  // Không dùng 'react-dom/client' cho React 16
import App from './App';
import './index.css';  // File chứa Tailwind directives

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
