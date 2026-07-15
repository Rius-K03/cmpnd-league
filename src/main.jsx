import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register service worker for PWA / "Add to Home Screen"
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
