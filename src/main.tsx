import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {installGlobalFetchFallback} from './lib/fallbackStore';
import {ErrorBoundary} from './components/common/ErrorBoundary';
import App from './App.tsx';
import './index.css';

installGlobalFetchFallback();

let rootElement = document.getElementById('root');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  rootElement.className = 'h-full';
  document.body.appendChild(rootElement);
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Tagpuan ERP Recovery Mode">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
