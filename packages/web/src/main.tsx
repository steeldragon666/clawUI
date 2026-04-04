import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initSocketListeners } from './lib/socket-init';
import './styles/globals.css';

// Initialize WS + fetch initial data into Zustand stores
initSocketListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
