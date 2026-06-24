import { LoginForm } from '@/components/auth/LoginForm';
import { BrandPanel } from '@/components/brand/BrandPanel';

export function LoginPage() {
  return (
    <main className="flex min-h-dvh w-full">
      <section className="hidden lg:flex w-1/2 items-center justify-center bg-navy-blue relative overflow-hidden">
        <BrandPanel />
      </section>

      <div className="hidden lg:block w-px self-stretch bg-cyber-green/20" />

      <section className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <LoginForm />
      </section>
    </main>
  );
}
