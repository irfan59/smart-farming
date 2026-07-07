import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

// resource: 'crops' | 'expense-categories' | 'income-categories'
export function useMasterData(resource) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const key = ['master', resource];
  const list = useQuery({ queryKey: key, queryFn: () => api.get(`/admin/${resource}`) });
  const create = useMutation({ mutationFn: (body) => api.post(`/admin/${resource}`, body), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  const update = useMutation({ mutationFn: ({ id, body }) => api.patch(`/admin/${resource}/${id}`, body), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  return { list, create, update };
}
