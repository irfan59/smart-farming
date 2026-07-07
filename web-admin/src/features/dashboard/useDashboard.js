import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useDashboard() {
  const { api } = useAuth();
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/admin/dashboard') });
}
