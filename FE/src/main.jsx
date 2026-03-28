import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initWS } from './ws';
import './styles.css';

initWS();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
