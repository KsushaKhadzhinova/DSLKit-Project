import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth';
import { AppRouter } from './router';
import ErrorBoundary from './shell/ErrorBoundary';
import './dslkit.css';
import './shell.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppRouter>
    </ErrorBoundary>
  </StrictMode>,
);
