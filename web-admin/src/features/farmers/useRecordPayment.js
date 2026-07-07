import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useRecordPayment(farmerId) {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/admin/payments', { farmerId, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer', farmerId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
