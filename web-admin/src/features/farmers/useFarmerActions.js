import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useFarmerActions(farmerId) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['farmer', farmerId] });
    qc.invalidateQueries({ queryKey: ['farmers'] });
  };
  return {
    approve: useMutation({ mutationFn: () => api.post(`/admin/farmers/${farmerId}/approve`), onSuccess: inval }),
    setStatus: useMutation({ mutationFn: (status) => api.patch(`/admin/farmers/${farmerId}`, { status }), onSuccess: inval }),
    deactivate: useMutation({ mutationFn: () => api.post(`/admin/farmers/${farmerId}/deactivate`), onSuccess: inval }),
    resetPassword: useMutation({ mutationFn: () => api.post(`/admin/farmers/${farmerId}/reset-password`) }),
  };
}
