import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AuthProvider, useAuth } from '@/app/providers/AuthContext';
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
