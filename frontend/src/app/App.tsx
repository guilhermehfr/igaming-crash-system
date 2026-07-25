import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AuthProvider, QueryProvider, useAuth } from '@/app/providers';
import { GamePage } from '@/pages/game';
import { LoginPage } from '@/pages/login';

function AppContent() {
  const { user, isLoading } = useAuth();

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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
