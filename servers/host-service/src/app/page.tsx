/**
 * Host Service Home Page
 * 
 * Simple status page showing available API endpoints and service information
 */

export default function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>🏢 Curia Host Service</h1>
      <p>Standalone forum hosting infrastructure for Curia</p>
      
      <h2>📊 Service Status</h2>
      <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
        <p>✅ Service is running</p>
        <p>📝 Environment: Development</p>
        <p>🕐 Started: {new Date().toISOString()}</p>
      </div>

      <h2>🔗 API Endpoints</h2>
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
        <h3>Plugin Communication APIs</h3>
        <ul>
          <li><code>POST /api/sign</code> - Request signing for plugins</li>
          <li><code>POST /api/user</code> - User information and friends</li>
          <li><code>POST /api/community</code> - Community information and role management</li>
          <li><code>GET /api/health</code> - Health check for Railway monitoring</li>
        </ul>

        <h3>Supported Methods</h3>
        <ul>
          <li><code>getUserInfo</code> - Get user profile information</li>
          <li><code>getUserFriends</code> - Get user's friend list with pagination</li>
          <li><code>getCommunityInfo</code> - Get community details and roles</li>
          <li><code>giveRole</code> - Assign roles to users</li>
        </ul>
      </div>

      <h2>🧪 Testing</h2>
      <div style={{ background: '#fefce8', padding: '20px', borderRadius: '8px' }}>
        <p>Ready to test the host service with your Curia app?</p>
        <div style={{ margin: '15px 0' }}>
          <a 
            href="/test" 
            style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            🚀 Open Plugin Tester
          </a>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          The plugin tester provides a UI to load your Curia app in an iframe and test the API communication in real-time.
        </p>
      </div>

      <h2>📚 Next Steps</h2>
      <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px' }}>
        <h3>Development Tasks</h3>
        <ul>
          <li>✅ Basic API endpoints created</li>
          <li>🔄 Add @curia_ library integration</li>
          <li>🔄 Implement real database connections</li>
          <li>🔄 Add authentication and authorization</li>
          <li>🔄 Create admin dashboard</li>
          <li>🔄 Add embedding JavaScript snippet generation</li>
        </ul>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f1f5f9', borderRadius: '8px' }}>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          🚀 Curia Host Service - Democratizing forum technology for any website
        </p>
      </div>
    </div>
  );
} 