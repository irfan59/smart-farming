import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

export function useMonthly(year, month) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['reports', 'monthly', year, month], queryFn: () => api.get(`/reports/monthly?year=${year}&month=${month}`) });
}

export function useYearly(year) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['reports', 'yearly', year], queryFn: () => api.get(`/reports/yearly?year=${year}`) });
}

export function usePerAcre() {
  const { api } = useAuth();
  return useQuery({ queryKey: ['reports', 'per-acre'], queryFn: async () => (await api.get('/reports/per-acre')).data });
}

export function useCropRanking() {
  const { api } = useAuth();
  return useQuery({ queryKey: ['reports', 'crop-ranking'], queryFn: async () => (await api.get('/reports/crop-ranking')).data });
}

export function useCropCycleReport(id) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['reports', 'cropCycle', id], queryFn: () => api.get(`/reports/crop-cycle/${id}`), enabled: !!id });
}
