import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

if (typeof window !== 'undefined' && typeof window.global === 'undefined'){
  window.global = window;
}

const root = createRoot(document.getElementById('root'));
root.render(<App/>);
