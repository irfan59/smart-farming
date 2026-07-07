import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useFarmers({ q = '', status = '', page = 1 } = {}) {
  const { api } = useAuth();
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  return useQuery({
    queryKey: ['farmers', { q, status, page }],
    queryFn: () => api.get(`/admin/farmers?${qs.toString()}`),
  });
}
