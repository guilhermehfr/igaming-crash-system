import { LoginPage } from '@/components/auth/LoginPage';
import { GamePage } from '@/components/game/GamePage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
