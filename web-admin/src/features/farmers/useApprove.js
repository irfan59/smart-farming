import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useApprove() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/admin/farmers/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
