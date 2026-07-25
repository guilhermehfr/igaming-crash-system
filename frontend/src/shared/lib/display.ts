export function toDisplayName(userId: string, demoSessionId: string | null): string {
  if (demoSessionId === null) return `Player-${userId.slice(0, 4)}`;
  return `Guest-${demoSessionId.slice(0, 4)}`;
}
