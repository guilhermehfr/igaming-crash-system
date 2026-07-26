import { ErrorBoundary } from '@/app/ErrorBoundary';
import { QueryProvider } from '@/app/providers';
import { GamePage } from '@/pages/game';
import { LoginPage } from '@/pages/login';
import { useAuthStore } from '@/shared/lib/stores';

function AppContent() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;

  if (user) {
    return <GamePage />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
