// Instruction: Import core React and React DOM client renderer
// Logic: Mounts the main React application tree into the HTML document root
import React from 'react';
import { createRoot } from 'react-dom/client';

// Instruction: Import global CSS styles including Tailwind v4
// Logic: Applies Tailwind styling and custom WhatsApp themes across the web app
import './index.css';

// Instruction: Import root App component
// Logic: Contains full routing, state management, and WhatsApp instance controls
import App from './App';

// Instruction: Get HTML container element
// Logic: Ensures root div exists before initializing React DOM
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Instruction: Render React App inside StrictMode
// Logic: Enforces clean lifecycle checks and renders the application
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);