import { useQuery } from '@tanstack/react-query';
import { batchGetUPSocialProfiles, UPSocialProfile } from '@/lib/upProfile';

export function useUPSocialProfiles(addresses: string[], enabled: boolean = true) {
  // Deduplicate and sort addresses to get a stable query key
  const normalized = Array.from(new Set(addresses.map(a => a.toLowerCase()))).sort();

  return useQuery<Record<string, UPSocialProfile>>({
    queryKey: ['up-social-profiles', normalized],
    queryFn: () => batchGetUPSocialProfiles(normalized),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && normalized.length > 0,
  });
} 