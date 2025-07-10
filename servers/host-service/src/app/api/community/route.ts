/**
 * Community API Route - Handles community-related API requests from plugins
 * 
 * This endpoint processes getCommunityInfo and giveRole requests
 * from plugins using the PluginHost service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PluginHost } from '@/lib/PluginHost';
import { DatabaseDataProvider } from '@/lib/DataProvider';

// Initialize the plugin host with data provider
const dataProvider = new DatabaseDataProvider();
const pluginHost = new PluginHost(dataProvider);

export async function POST(request: NextRequest) {
  try {
    // Get request origin for CORS validation
    const origin = request.headers.get('origin') || '';
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.method || !body.communityId) {
      return NextResponse.json({
        data: null,
        success: false,
        error: 'Missing required fields: method, communityId'
      }, { status: 400 });
    }

    // Only handle community-related methods
    if (!['getCommunityInfo', 'giveRole'].includes(body.method)) {
      return NextResponse.json({
        data: null,
        success: false,
        error: `Invalid method for community endpoint: ${body.method}`
      }, { status: 400 });
    }

    // Validate origin (for production, check against allowed origins)
    // For development, we'll allow all origins
    if (!pluginHost.validateOrigin(origin)) {
      return NextResponse.json({
        data: null,
        success: false,
        error: 'Unauthorized origin'
      }, { status: 403 });
    }

    // Process the API request
    const response = await pluginHost.processApiRequest(body);
    
    // Log the request for development
    console.log('[Community API] Request processed:', {
      method: body.method,
      communityId: body.communityId,
      params: body.params,
      success: response.success
    });

    // Return response with appropriate status code
    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('[Community API] Error processing request:', error);
    
    return NextResponse.json({
      data: null,
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    data: null,
    success: false,
    error: 'Method not allowed. Use POST for API requests.'
  }, { status: 405 });
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 