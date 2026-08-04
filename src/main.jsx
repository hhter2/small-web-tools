import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import App from './App.jsx';
import LanguageSwitcherProvider from './components/LanguageSwitcherProvider.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageSwitcherProvider>
      <App />
    </LanguageSwitcherProvider>
  </React.StrictMode>
);
