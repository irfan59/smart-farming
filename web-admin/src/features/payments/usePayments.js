import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function usePayments({ farmerId = '', from = '', to = '' } = {}) {
  const { api } = useAuth();
  const qs = new URLSearchParams();
  if (farmerId) qs.set('farmerId', farmerId);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return useQuery({ queryKey: ['payments', { farmerId, from, to }], queryFn: () => api.get(`/admin/payments?${qs.toString()}`) });
}
