import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useCropCycles() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['cropCycles'], queryFn: async () => (await api.get('/crop-cycles')).data });
  const create = useMutation({ mutationFn: (body) => api.post('/crop-cycles', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['cropCycles'] }) });
  return { list, create };
}
