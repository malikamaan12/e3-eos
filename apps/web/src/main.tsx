// Release v1.0.3: Scope CRUD hardening (Quick Add, Detailed Requirement, Bulk Entry)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
