import { Rocket } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { useAuth } from '@/contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="w-full max-w-md space-y-10">
      <div className="text-center lg:text-left">
        <div className="lg:hidden mb-8 flex justify-center">
          <Rocket className="w-16 h-16 text-cyber-green" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight font-heading">Welcome back</h1>
        <p className="mt-3 text-slate-400 text-sm">
          Sign in to access your dashboard, games, and rewards.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded-sm border-slate-700 bg-slate-900 text-cyber-green focus:ring-cyber-green focus:ring-offset-deep-slate accent-cyber-green"
          />
          <label htmlFor="remember-me" className="ml-3 block text-sm text-slate-400">
            Remember me
          </label>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button type="submit" className="w-full">
          Log In
        </Button>
      </form>
    </div>
  );
}
