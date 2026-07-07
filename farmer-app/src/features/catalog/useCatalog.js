import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';

// resource: 'crops' | 'expense-categories' | 'income-categories' | 'land-units'
export function useCatalog(resource) {
  const { api } = useAuth();
  return useQuery({ queryKey: ['catalog', resource], queryFn: async () => (await api.get(`/catalog/${resource}`)).data });
}
