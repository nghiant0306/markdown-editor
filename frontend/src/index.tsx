import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress ResizeObserver loop warning
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ResizeObserver loop completed')) {
    event.preventDefault();
    return false;
  }
});

const originalError = console.error;
console.error = function (...args: any[]) {
  if (
    args[0] && 
    (typeof args[0] === 'string' || args[0]?.toString?.()) &&
    (args[0].toString?.() || String(args[0])).includes('ResizeObserver loop completed')
  ) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);
