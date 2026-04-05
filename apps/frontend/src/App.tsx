import './App.css';
import { AppRouter } from '@/routes';
import { Providers } from '@/context/providers.tsx';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@sentry/react';
import { PWAUpdatePrompt } from '@/components/pwa-update-prompt';

function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
        <Toaster />
        <PWAUpdatePrompt />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;
