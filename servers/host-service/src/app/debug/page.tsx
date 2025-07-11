/**
 * Debug Page - Shows raw API responses from DataProvider
 * 
 * This page calls all DataProvider methods and displays the exact JSON
 * responses that the forum receives, allowing us to debug format issues.
 */

import { DatabaseDataProvider } from '../../lib/DataProvider';

// Create the same data provider instance used by the APIs
const dataProvider = new DatabaseDataProvider();

interface DebugResult {
  method: string;
  params: any;
  response: any;
  timestamp: string;
}

export default async function DebugPage() {
  const results: DebugResult[] = [];
  const testUserId = 'default_user';
  const testCommunityId = 'default_community';

  try {
    // Test getUserInfo
    console.log('[Debug] Testing getUserInfo...');
    const userInfoResponse = await dataProvider.getUserInfo(testUserId, testCommunityId);
    results.push({
      method: 'getUserInfo',
      params: { userId: testUserId, communityId: testCommunityId },
      response: userInfoResponse,
      timestamp: new Date().toISOString()
    });

    // Test getCommunityInfo  
    console.log('[Debug] Testing getCommunityInfo...');
    const communityInfoResponse = await dataProvider.getCommunityInfo(testCommunityId);
    results.push({
      method: 'getCommunityInfo',
      params: { communityId: testCommunityId },
      response: communityInfoResponse,
      timestamp: new Date().toISOString()
    });

    // Test getContextData
    console.log('[Debug] Testing getContextData...');
    const contextDataResponse = await dataProvider.getContextData(testUserId, testCommunityId);
    results.push({
      method: 'getContextData',
      params: { userId: testUserId, communityId: testCommunityId },
      response: contextDataResponse,
      timestamp: new Date().toISOString()
    });

    // Test getUserFriends
    console.log('[Debug] Testing getUserFriends...');
    const friendsResponse = await dataProvider.getUserFriends(testUserId, testCommunityId, 5, 0);
    results.push({
      method: 'getUserFriends',
      params: { userId: testUserId, communityId: testCommunityId, limit: 5, offset: 0 },
      response: friendsResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    results.push({
      method: 'ERROR',
      params: {},
      response: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    });
  }

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      padding: '20px', 
      backgroundColor: '#1e1e1e', 
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#00ff00', marginBottom: '20px' }}>
        🐛 DataProvider Debug Results
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#333', borderRadius: '5px' }}>
        <h3>Test Parameters:</h3>
        <p>• userId: {testUserId}</p>
        <p>• communityId: {testCommunityId}</p>
        <p>• timestamp: {new Date().toISOString()}</p>
      </div>

      {results.map((result, index) => (
        <div key={index} style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          backgroundColor: '#2a2a2a', 
          borderRadius: '8px',
          border: result.method === 'ERROR' ? '2px solid #ff0000' : '2px solid #00ff00'
        }}>
          <h2 style={{ 
            color: result.method === 'ERROR' ? '#ff4444' : '#44ff44', 
            marginBottom: '10px' 
          }}>
            {index + 1}. {result.method}
          </h2>
          
          <div style={{ marginBottom: '10px' }}>
            <h4 style={{ color: '#ffff44' }}>Request Parameters:</h4>
            <pre style={{ 
              backgroundColor: '#111', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result.params, null, 2)}
            </pre>
          </div>

          <div>
            <h4 style={{ color: '#44ffff' }}>Response Data:</h4>
            <pre style={{ 
              backgroundColor: '#111', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {JSON.stringify(result.response, null, 2)}
            </pre>
          </div>

          <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>
            Executed at: {result.timestamp}
          </p>
        </div>
      ))}

      <div style={{ 
        marginTop: '40px', 
        padding: '15px', 
        backgroundColor: '#444', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ color: '#ffff44' }}>Expected Forum Format (from MockDataProvider):</h3>
        <pre style={{ 
          backgroundColor: '#111', 
          padding: '10px', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
{`UserInfo: {
  id: string,           // NOT userId!
  name: string,
  email: string,
  imageUrl: string,     // NOT profilePictureUrl!
  roles: string[],
  twitter?: { username: string },
  lukso?: { username: string },
  farcaster?: { username: string }
}

CommunityInfo: {
  id: string,
  title: string,        // NOT name!
  description: string,
  url: string,          // Community short ID
  smallLogoUrl: string, // NOT logo_url!
  roles: Role[]
}

ContextData: {
  pluginId: string,
  userId: string,       // Required!
  assignableRoleIds: string[]
}`}
        </pre>
      </div>
    </div>
  );
} 