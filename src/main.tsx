import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PasswordGate } from './components/PasswordGate';
import './index.css';

// Stop the trackpad/mouse wheel from accidentally bumping number-input values.
document.addEventListener(
  'wheel',
  () => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === 'number') el.blur();
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>
);
