import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import { ThemeProvider } from '../src/context/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/lib/i18n';
import i18n from 'i18next';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
beforeMount(async ({ App }) => {
  if (!i18n.isInitialized) {
    await new Promise<void>(resolve => {
      i18n.on('initialized', () => resolve());
    });
  }
  await i18n.loadNamespaces(['common', 'inspection', 'apiary', 'hive', 'queen', 'auth', 'onboarding']);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  );
});
