import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function usePlots() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['plots'], queryFn: async () => (await api.get('/plots')).data });
  const create = useMutation({ mutationFn: (body) => api.post('/plots', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['plots'] }) });
  const deactivate = useMutation({ mutationFn: (id) => api.del(`/plots/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['plots'] }) });
  return { list, create, deactivate };
}
