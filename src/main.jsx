import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import App from './App.jsx';
import MobileLanguageSwitcher from './components/MobileLanguageSwitcher.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <MobileLanguageSwitcher />
  </React.StrictMode>
);
