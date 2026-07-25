import { Rocket } from 'lucide-react';

export function BrandPanel() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Rocket className="w-48 h-48 text-cyber-green" strokeWidth={1.5} />
      <div className="text-center">
        <h1 className="text-5xl font-bold italic uppercase tracking-tighter text-cyber-green leading-none font-heading">
          CRASH_SYSTEM
        </h1>
        <p className="mt-4 text-[10px] uppercase tracking-[0.3em] font-medium text-slate-500">
          ASCEND TO THE NEXT LEVEL
        </p>
      </div>
    </div>
  );
}
