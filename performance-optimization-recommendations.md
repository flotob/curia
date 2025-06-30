## Advanced Performance Optimization Recommendations

### 1. **Image Optimization & Lazy Loading**

```typescript
// src/components/ui/OptimizedImage.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  lazy?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  lazy = true
}) => {
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const [isLoaded, setIsLoaded] = useState(false);

  const observerRef = useIntersectionObserver(
    useCallback(() => setShouldLoad(true), []),
    {
      threshold: 0.1,
      rootMargin: '50px',
      enabled: lazy && !shouldLoad
    }
  );

  if (!shouldLoad) {
    return (
      <div 
        ref={observerRef}
        className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};
```

### 2. **Advanced Bundle Splitting Strategy**

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@emoji-mart/react',
      '@emoji-mart/data',
      'lucide-react'
    ]
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate chunk for heavy components
          gating: {
            test: /[\\/]components[\\/]gating[\\/]/,
            name: 'gating',
            chunks: 'async',
            priority: 10,
          },
          // Separate chunk for emoji picker
          emoji: {
            test: /@emoji-mart/,
            name: 'emoji-picker',
            chunks: 'async',
            priority: 15,
          },
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'initial',
            priority: 5,
          }
        }
      };
    }
    return config;
  }
};
```

### 3. **Service Worker for Aggressive Caching**

```typescript
// public/sw.js
const CACHE_NAME = 'forum-v1';
const STATIC_ASSETS = [
  '/_next/static/css/',
  '/_next/static/js/',
  '/fonts/',
  '/icons/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Cache API responses with smart invalidation
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
  }
});
```

### 4. **Prefetching Strategy**

```typescript
// src/hooks/usePrefetch.ts
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchPost = useCallback((postId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['post', postId],
      queryFn: () => authFetchJson(`/api/posts/${postId}`),
      staleTime: 30000,
    });
  }, [queryClient]);

  const prefetchComments = useCallback((postId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['comments', postId],
      queryFn: () => authFetchJson(`/api/posts/${postId}/comments`),
      staleTime: 30000,
    });
  }, [queryClient]);

  return { prefetchPost, prefetchComments };
};

// Use in PostCard component for hover prefetching
const { prefetchPost, prefetchComments } = usePrefetch();

const handleMouseEnter = useCallback(() => {
  prefetchPost(post.id);
  prefetchComments(post.id);
}, [post.id, prefetchPost, prefetchComments]);
```

### 5. **Database Query Optimization**

```sql
-- Add compound indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_posts_board_created_at 
ON posts(board_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_comments_post_created_at 
ON comments(post_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_reactions_content_emoji 
ON reactions(post_id, emoji) WHERE post_id IS NOT NULL;

-- Materialized view for comment counts
CREATE MATERIALIZED VIEW post_comment_counts AS
SELECT 
  post_id,
  COUNT(*) as comment_count,
  MAX(created_at) as last_comment_at
FROM comments 
GROUP BY post_id;

CREATE UNIQUE INDEX ON post_comment_counts(post_id);
```

### 6. **Advanced Skeleton Loading**

```typescript
// src/components/ui/ContentSkeleton.tsx
interface ContentSkeletonProps {
  type: 'post' | 'comment' | 'user-profile';
  count?: number;
  showAvatar?: boolean;
}

export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({
  type,
  count = 1,
  showAvatar = true
}) => {
  const skeletonItems = Array.from({ length: count }, (_, i) => (
    <div key={i} className={getSkeletonClasses(type)}>
      {showAvatar && type !== 'post' && (
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      )}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        {type === 'post' && (
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
        )}
      </div>
    </div>
  ));

  return <div className="space-y-4">{skeletonItems}</div>;
};
```

### 7. **Memory Leak Prevention**

```typescript
// src/hooks/useMemoryOptimized.ts
import { useEffect, useRef } from 'react';

export const useMemoryOptimized = <T>(data: T[], maxItems: number = 1000) => {
  const dataRef = useRef<T[]>([]);

  useEffect(() => {
    // Prevent memory leaks from large arrays
    if (data.length > maxItems) {
      dataRef.current = data.slice(-maxItems);
    } else {
      dataRef.current = data;
    }
  }, [data, maxItems]);

  return dataRef.current;
};

// Clean up large objects in components
export const useCleanup = (cleanupFn: () => void, deps: any[]) => {
  useEffect(() => {
    return cleanupFn;
  }, deps);
};
```

### 8. **Advanced Performance Metrics**

```typescript
// src/components/debug/AdvancedPerformanceMonitor.tsx
export const AdvancedPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    bundleSize: 0,
    renderTime: 0,
    apiLatency: 0,
    cacheHitRate: 0,
    errorRate: 0
  });

  useEffect(() => {
    // Track bundle size
    if ('connection' in navigator) {
      const nav = navigator as any;
      console.log('Connection:', nav.connection?.effectiveType);
    }

    // Track API performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const end = performance.now();
      
      setMetrics(prev => ({
        ...prev,
        apiLatency: end - start
      }));
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Real User Monitoring integration
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          console.log('Navigation timing:', {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            request: nav.responseStart - nav.requestStart,
            response: nav.responseEnd - nav.responseStart,
            dom: nav.domContentLoadedEventEnd - nav.responseEnd
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
    return () => observer.disconnect();
  }, []);
};
```

### 9. **Implementation Priority**

1. **High Impact, Low Effort:**
   - Image lazy loading
   - Service worker caching
   - Database indexes

2. **High Impact, Medium Effort:**
   - Advanced bundle splitting
   - Prefetching strategy
   - Memory optimization

3. **Medium Impact, High Effort:**
   - Advanced performance monitoring
   - Service worker advanced features
   - Database materialized views

### 10. **Performance Budget Monitoring**

```typescript
// performance.config.js
module.exports = {
  budgets: [
    {
      type: 'initial',
      maximumWarning: '500kb',
      maximumError: '1mb'
    },
    {
      type: 'anyComponentStyle',
      maximumWarning: '2kb',
      maximumError: '4kb'
    }
  ],
  metrics: {
    FCP: { warning: 1800, error: 3000 },
    LCP: { warning: 2500, error: 4000 },
    CLS: { warning: 0.1, error: 0.25 },
    FID: { warning: 100, error: 300 }
  }
};
```