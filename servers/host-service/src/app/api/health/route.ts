/**
 * Health Check API Route
 * 
 * This endpoint is used by Railway for health monitoring and deployment validation.
 * It performs basic checks on the service to ensure it's running correctly.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic service health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'curia-host-service',
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        api: 'operational',
        memory: 'ok',
        // TODO: Add database connectivity check when DB is implemented
        // database: await checkDatabaseConnection() ? 'operational' : 'degraded'
      }
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Warning if memory usage is high (over 512MB)
    if (memUsageMB > 512) {
      healthStatus.checks.memory = 'warning';
    }

    // Log health check (useful for monitoring)
    console.log(`[Health Check] Service healthy - Memory: ${memUsageMB}MB, Uptime: ${Math.round(process.uptime())}s`);

    return NextResponse.json(healthStatus, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[Health Check] Service unhealthy:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'curia-host-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 