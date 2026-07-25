import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';

export function useBalance(userId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiFetch(`${config.apiUrl}/wallets/${userId}`);
      if (!res.ok) throw new Error('Failed to load wallet balance');
      const data = await res.json();
      return data.balanceInMainUnit as number;
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const refreshBalance = useCallback(
    async (id: string) => {
      try {
        const res = await apiFetch(`${config.apiUrl}/wallets/${id}`);
        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(['wallet-balance', id], data.balanceInMainUnit);
        }
      } catch {
        // silently fail
      }
    },
    [queryClient],
  );

  return {
    balance: query.data ?? null,
    refreshBalance,
  };
}
