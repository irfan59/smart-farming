import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useFarmer(id) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['farmer', id], queryFn: () => api.get(`/admin/farmers/${id}`), enabled: !!id });
}
