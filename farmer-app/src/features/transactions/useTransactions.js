import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useTransactions({ cropCycleId, type } = {}) {
  const { api } = useAuth();
  const qs = new URLSearchParams();
  if (cropCycleId) qs.set('cropCycleId', cropCycleId);
  if (type) qs.set('type', type);
  return useQuery({ queryKey: ['transactions', { cropCycleId, type }], queryFn: async () => (await api.get(`/transactions?${qs.toString()}`)).data });
}
