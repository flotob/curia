'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  Cpu, 
  Eye, 
  MemoryStick,
  TrendingUp,
  X
} from 'lucide-react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  memoryUsage?: number;
  domNodeCount: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
}

interface PerformanceMonitorProps {
  componentName?: string;
  autoTrack?: boolean;
  showInProduction?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName = 'Component',
  autoTrack = true,
  showInProduction = false,
  position = 'bottom-right'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
    domNodeCount: 0,
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>();
  const observer = useRef<PerformanceObserver | null>(null);

  // Don't show in production unless explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || showInProduction;

  // Track render performance
  const trackRender = useCallback(() => {
    if (!autoTrack || !shouldShow) return;

    const now = performance.now();
    
    if (startTime.current) {
      const renderTime = now - startTime.current;
      renderTimes.current.push(renderTime);
      
      // Keep only last 100 renders for average calculation
      if (renderTimes.current.length > 100) {
        renderTimes.current.shift();
      }
      
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      
      setMetrics(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        avgRenderTime,
      }));
    }
    
    startTime.current = now;
  }, [autoTrack, shouldShow]);

  // Track Web Vitals
  useEffect(() => {
    if (!shouldShow) return;

    // Performance Observer for Web Vitals
    if (typeof PerformanceObserver !== 'undefined') {
      observer.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, firstContentfulPaint: entry.startTime }));
            }
          } else if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({ ...prev, largestContentfulPaint: entry.startTime }));
          } else if (entry.entryType === 'layout-shift' && !('hadRecentInput' in entry && entry.hadRecentInput)) {
            setMetrics(prev => ({ 
              ...prev, 
              cumulativeLayoutShift: (prev.cumulativeLayoutShift || 0) + (('value' in entry && typeof entry.value === 'number') ? entry.value : 0)
            }));
          }
        }
      });

      observer.current.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [shouldShow]);

  // Track DOM node count
  useEffect(() => {
    if (!shouldShow) return;

    const updateDOMCount = () => {
      const domNodeCount = document.querySelectorAll('*').length;
      setMetrics(prev => ({ ...prev, domNodeCount }));
    };

    updateDOMCount();
    const interval = setInterval(updateDOMCount, 2000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  // Track memory usage (if available)
  useEffect(() => {
    if (!shouldShow) return;

    const updateMemoryUsage = () => {
      // @ts-ignore - Chrome-specific memory API
      if (performance.memory && performance.memory.usedJSHeapSize) {
        // @ts-ignore - Chrome-specific memory API
        const usedHeap = performance.memory.usedJSHeapSize;
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: usedHeap / 1024 / 1024 // Convert to MB
        }));
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  // Track renders
  useEffect(() => {
    trackRender();
  });

  // Format time values
  const formatTime = (time: number) => {
    if (time < 1) return `${time.toFixed(2)}ms`;
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  // Format memory values
  const formatMemory = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)}KB`;
    return `${mb.toFixed(1)}MB`;
  };

  // Get performance status color
  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'bg-green-500';
    if (value <= thresholds[1]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!shouldShow) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-sm`}>
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          className="bg-black/80 hover:bg-black text-white text-xs"
        >
          <Activity className="h-3 w-3 mr-1" />
          Perf
        </Button>
      ) : (
        <Card className="bg-black/90 text-white border-gray-600 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center">
                <Cpu className="h-4 w-4 mr-2" />
                {componentName} Performance
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setIsVisible(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="text-xs space-y-2">
            {/* Quick metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span>Renders:</span>
                <Badge variant="outline" className="text-xs">
                  {metrics.renderCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>DOM Nodes:</span>
                <Badge variant="outline" className="text-xs">
                  {metrics.domNodeCount.toLocaleString()}
                </Badge>
              </div>
            </div>

            {/* Last render time */}
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Last Render:
              </span>
              <div className="flex items-center gap-1">
                <div 
                  className={`w-2 h-2 rounded-full ${getStatusColor(metrics.lastRenderTime, [16, 50])}`}
                />
                <span>{formatTime(metrics.lastRenderTime)}</span>
              </div>
            </div>

            {/* Average render time */}
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Avg Render:
              </span>
              <div className="flex items-center gap-1">
                <div 
                  className={`w-2 h-2 rounded-full ${getStatusColor(metrics.avgRenderTime, [16, 50])}`}
                />
                <span>{formatTime(metrics.avgRenderTime)}</span>
              </div>
            </div>

            {/* Memory usage */}
            {metrics.memoryUsage && (
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <MemoryStick className="h-3 w-3 mr-1" />
                  Memory:
                </span>
                <div className="flex items-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${getStatusColor(metrics.memoryUsage, [50, 100])}`}
                  />
                  <span>{formatMemory(metrics.memoryUsage)}</span>
                </div>
              </div>
            )}

            {/* Expanded metrics */}
            {isExpanded && (
              <div className="pt-2 border-t border-gray-600 space-y-1">
                {metrics.firstContentfulPaint && (
                  <div className="flex justify-between">
                    <span>FCP:</span>
                    <span>{formatTime(metrics.firstContentfulPaint)}</span>
                  </div>
                )}
                {metrics.largestContentfulPaint && (
                  <div className="flex justify-between">
                    <span>LCP:</span>
                    <span>{formatTime(metrics.largestContentfulPaint)}</span>
                  </div>
                )}
                {metrics.cumulativeLayoutShift !== undefined && (
                  <div className="flex justify-between">
                    <span>CLS:</span>
                    <div className="flex items-center gap-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${getStatusColor(metrics.cumulativeLayoutShift, [0.1, 0.25])}`}
                      />
                      <span>{metrics.cumulativeLayoutShift.toFixed(3)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Performance tips */}
            {isExpanded && (
              <div className="pt-2 border-t border-gray-600 text-xs text-gray-300">
                <div className="space-y-1">
                  <div>• Good render: &lt;16ms</div>
                  <div>• Good LCP: &lt;2.5s</div>
                  <div>• Good CLS: &lt;0.1</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};