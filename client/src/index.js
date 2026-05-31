import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Unregister service worker for development to avoid caching issues
serviceWorkerRegistration.unregister();

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  serviceWorkerRegistration.requestNotificationPermission();
}
