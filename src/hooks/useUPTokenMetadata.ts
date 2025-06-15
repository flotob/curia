import { useQuery } from '@tanstack/react-query';
import { getUPTokenMetadata, UPTokenMetadata } from '@/lib/upProfile';

// Simple batch fetcher (parallel) – since we don't yet have a dedicated batch endpoint
async function batchGetTokenMetadata(addresses: string[]): Promise<Record<string, UPTokenMetadata>> {
  const entries = await Promise.all(
    addresses.map(async (addr) => {
      const meta = await getUPTokenMetadata(addr);
      return [addr, meta] as const;
    })
  );
  return Object.fromEntries(entries);
}

export function useUPTokenMetadata(addresses: string[], enabled: boolean = true) {
  const normalized = Array.from(new Set(addresses.map(a => a.toLowerCase()))).sort();

  return useQuery<Record<string, UPTokenMetadata>>({
    queryKey: ['up-token-metadata', normalized],
    queryFn: () => batchGetTokenMetadata(normalized),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && normalized.length > 0,
  });
} 