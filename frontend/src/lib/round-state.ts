import type { CrashRound, LiveBet, RoundState } from '@/contexts/SocketContext';

export const NEXT_STATE: Record<string, RoundState> = {
  betting: 'running',
  running: 'crashed',
  crashed: 'betting',
};

export function betStateToLabel(state: string): string {
  if (state === 'lost') return 'BUSTED';
  if (state === 'cashed_out') return 'CASHED OUT';
  if (state === 'pending') return 'In Position';
  return 'No Position';
}

export function betStateToColor(state: string): string {
  if (state === 'lost') return 'bg-loss-red';
  if (state === 'cashed_out') return 'bg-neon-green';
  if (state === 'pending') return 'bg-neon-green';
  return 'bg-slate-500';
}

export function betStateToGlow(state: string): string {
  return state === 'pending' || state === 'cashed_out'
    ? 'shadow-[0_0_6px_theme(colors.neon-green/40)]'
    : '';
}

export function roundStateToTextColor(state: RoundState): string {
  return state === 'crashed' ? 'text-loss-red' : 'text-neon-green';
}

export function betOutcomeToColor(outcome: LiveBet['outcome']): string {
  if (outcome.type === 'cashed') return 'bg-neon-green';
  if (outcome.type === 'lost') return 'bg-loss-red';
  return 'bg-slate-500';
}

export function betOutcomeToDisplayText(outcome: LiveBet['outcome']): string {
  if (outcome.type === 'pending') return '-';
  if (outcome.type === 'cashed') return `${outcome.multiplier.toFixed(2)}x`;
  return 'LOST';
}

export function crashTypeToColor(type: CrashRound['type']): string {
  if (type === 'cashed') return 'bg-neon-green/10 border border-neon-green/30 text-neon-green';
  if (type === 'busted') return 'bg-loss-red/10 border border-loss-red/40 text-loss-red';
  return 'bg-slate-500/10 border border-slate-500/30 text-slate-500';
}
