import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useConfig() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['config'], queryFn: () => api.get('/admin/config') });
  const update = useMutation({ mutationFn: (body) => api.patch('/admin/config', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }) });
  return { query, update };
}
