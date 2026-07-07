import { useAuth } from '../../auth/useAuth';

// Returns a fetcher: (cropCycleId) => { familyLabour:{ratePerDay,prompt}, ownLandRentalValue:{amount} }
export function useSuggestedImputed() {
  const { api } = useAuth();
  return (cropCycleId) => api.get(`/transactions/suggested-imputed?cropCycleId=${cropCycleId}`);
}
