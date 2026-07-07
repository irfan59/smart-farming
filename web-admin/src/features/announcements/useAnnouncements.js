import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useAnnouncements() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['announcements'], queryFn: () => api.get('/admin/announcements') });
  const create = useMutation({ mutationFn: (body) => api.post('/admin/announcements', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
  return { list, create };
}
