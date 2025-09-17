import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

// Suppress known benign ResizeObserver loop errors from React Flow/Chrome
const roError = 'ResizeObserver loop completed with undelivered notifications.';
const roLimitError = 'ResizeObserver loop limit exceeded';
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args && args[0] ? String(args[0]) : '';
  if (msg.includes(roError) || msg.includes(roLimitError)) {
    return;
  }
  originalConsoleError(...args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
