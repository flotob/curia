7548-d3ec474e1cdda674.js:1 [AuthContext] AuthService initialized.
7548-d3ec474e1cdda674.js:1 [CgLibContext] Initialize effect triggered. Current iframeUid: MD0425CHK5, publicKey set: true
7548-d3ec474e1cdda674.js:1 [CgLibContext] Attempting to initialize CgPluginLib with iframeUid: MD0425CHK5
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Initialized with iframeUid: MD0425CHK5
layout-923f7931f49f4051.js:1 [AppInitializer] CgLib is still initializing. Waiting...
7548-d3ec474e1cdda674.js:1 [AuthContext] AuthService initialized.
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getContextData request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600016_trnq71wu1', method: 'getContextData', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getContextData undefined
VM403:5 Model-viewer ES module imported successfully
VM403:7 model-viewer custom element is available
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600016_trnq71wu1: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600016_trnq71wu1', data: {…}}
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Context data cached successfully
7548-d3ec474e1cdda674.js:1 [CgLibContext] CgPluginLib initialized successfully.
layout-923f7931f49f4051.js:1 [AppInitializer] CgInstance and iframeUid available. Attempting to fetch user data and login.
page-09f72aae45fbc377.js:1 [HomePage] 🔍 Running shared content detection...
page-09f72aae45fbc377.js:1 [cookieUtils] Checking for shared content...
page-09f72aae45fbc377.js:1 [cookieUtils] All cookies: 
page-09f72aae45fbc377.js:1 [cookieUtils] No shared_post_data cookie found
page-09f72aae45fbc377.js:1 [HomePage] No shared content detected
page-09f72aae45fbc377.js:1 (index)browserexpectation(index)browserexpectation0'Chromium/Edge''cookie should be present'1'Safari/iOS''cookie usually blocked by ITP'2'Firefox (strict/private)''cookie likely blocked by ETP'Array(3)
page-09f72aae45fbc377.js:1 [cookieUtils] Cookie detection results: {shared_post_data: false, shared_post_data_value: null, all_cookies: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Ap…KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', location: 'https://embed.curia.network/?mod=standalone&cg_theme=light&iframeUid=MD0425CHK5'}
7548-d3ec474e1cdda674.js:1 [AuthContext] AuthService initialized.
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getUserInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600272_qsonziqoj', method: 'getUserInfo', params: undefined, …}
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getCommunityInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600274_7dntcbw2u', method: 'getCommunityInfo', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getUserInfo undefined
embed.js:174 [InternalPluginHost] API request: getCommunityInfo undefined
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600272_qsonziqoj: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600272_qsonziqoj', data: {…}}
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600274_7dntcbw2u: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600274_7dntcbw2u', data: {…}}
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getCommunityInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600364_aqa975oh0', method: 'getCommunityInfo', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getCommunityInfo undefined
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600364_aqa975oh0: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600364_aqa975oh0', data: {…}}
layout-923f7931f49f4051.js:1 [AppInitializer] Extracted context data: {communityShortId: 'commonground', pluginId: undefined, contextData: {…}}
layout-923f7931f49f4051.js:1 [AppInitializer] Data fetched successfully. Calling auth.login() with payload: {userId: undefined, name: undefined, profilePictureUrl: undefined, roles: undefined, communityRoles: Array(3), …}
7548-d3ec474e1cdda674.js:1 [AuthContext] LOGIN ATTEMPT. User roles from input: undefined Community roles from input: (3) [{…}, {…}, {…}]
7548-d3ec474e1cdda674.js:1 [AuthContext] Skipping friends sync: cgInstance not available, CG lib still initializing, iframeUid not available
7548-d3ec474e1cdda674.js:1 

            
            
           POST https://embed.curia.network/api/auth/session 400 (Bad Request)



1517-02f35fb8fafe0222.js:1 [AuthContext] Fetch session token failed: {error: 'User ID, iframeUid, and Community ID are required for session'}



1517-02f35fb8fafe0222.js:1 Login failed overall: Error: User ID, iframeUid, and Community ID are required for session
    at 7548-d3ec474e1cdda674.js:1:6219
    at async Object.login (7548-d3ec474e1cdda674.js:1:6870)
    at async layout-923f7931f49f4051.js:1:2036



layout-923f7931f49f4051.js:1 [AppInitializer] CgInstance and iframeUid available. Attempting to fetch user data and login.
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getUserInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316602725_x3zkgn0jl', method: 'getUserInfo', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getUserInfo undefined
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316602725_x3zkgn0jl: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316602725_x3zkgn0jl', data: {…}}
 [CgPluginLib] Request signed successfully
 [CgPluginLib] Sent getCommunityInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316602828_y78wdzrxh', method: 'getCommunityInfo', params: undefined, …}
 [InternalPluginHost] API request: getCommunityInfo undefined
 [CgPluginLib] Received response for req_1752316602828_y78wdzrxh: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316602828_y78wdzrxh', data: {…}}
 [AppInitializer] Extracted context data: {communityShortId: 'commonground', pluginId: undefined, contextData: {…}}
 [AppInitializer] Data fetched successfully. Calling auth.login() with payload: {userId: undefined, name: undefined, profilePictureUrl: undefined, roles: undefined, communityRoles: Array(3), …}
 [AuthContext] LOGIN ATTEMPT. User roles from input: undefined Community roles from input: (3) [{…}, {…}, {…}]
 [AuthContext] Skipping friends sync: cgInstance not available, CG lib still initializing, iframeUid not available
  POST https://embed.curia.network/api/auth/session 400 (Bad Request)



  layout-923f7931f49f4051.js:1 [AppInitializer] CgInstance and iframeUid available. Attempting to fetch user data and login.
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getUserInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600556_hdfcltyas', method: 'getUserInfo', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getUserInfo undefined
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600556_hdfcltyas: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600556_hdfcltyas', data: {…}}
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Request signed successfully
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Sent getCommunityInfo request: {type: 'api_request', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600636_7xcobi0in', method: 'getCommunityInfo', params: undefined, …}
embed.js:174 [InternalPluginHost] API request: getCommunityInfo undefined
2274-a34e2ab61ddf6f73.js:1 [CgPluginLib] Received response for req_1752316600636_7xcobi0in: {type: 'api_response', iframeUid: 'MD0425CHK5', requestId: 'req_1752316600636_7xcobi0in', data: {…}}
layout-923f7931f49f4051.js:1 [AppInitializer] Extracted context data: {communityShortId: 'commonground', pluginId: undefined, contextData: {…}}
layout-923f7931f49f4051.js:1 [AppInitializer] Data fetched successfully. Calling auth.login() with payload: {userId: undefined, name: undefined, profilePictureUrl: undefined, roles: undefined, communityRoles: Array(3), …}
7548-d3ec474e1cdda674.js:1 [AuthContext] LOGIN ATTEMPT. User roles from input: undefined Community roles from input: (3) [{…}, {…}, {…}]
7548-d3ec474e1cdda674.js:1 [AuthContext] Skipping friends sync: cgInstance not available, CG lib still initializing, iframeUid not available
7548-d3ec474e1cdda674.js:1 
            
            
           POST https://embed.curia.network/api/auth/session 400 (Bad Request)