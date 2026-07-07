import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useAnnouncements() {
  const { api } = useAuth();
  return useQuery({ queryKey: ['announcements'], queryFn: async () => (await api.get('/announcements')).data });
}
