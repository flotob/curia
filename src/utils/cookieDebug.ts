/**
 * Manual cookie debugging utilities
 * These can be called from the browser console to test cookie functionality
 */

// Make these functions available on window for console testing
declare global {
  interface Window {
    cookieDebug: {
      listAllCookies: () => void;
      testSetCookie: () => void;
      testGetSharedData: () => void;
      manuallySetSharedCookie: (postId: string, boardId: string) => void;
    };
  }
}

/**
 * List all cookies accessible to this context
 */
function listAllCookies() {
  console.log('=== ALL COOKIES ===');
  console.log('document.cookie:', document.cookie);
  
  if (!document.cookie) {
    console.log('❌ No cookies found');
    return;
  }
  
  const cookies = document.cookie.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return { name, value: decodeURIComponent(value || '') };
  });
  
  console.table(cookies);
}

/**
 * Test if we can set and read cookies in this context
 */
function testSetCookie() {
  console.log('=== TESTING COOKIE SET/GET ===');
  
  const testName = 'test_cookie';
  const testValue = 'test_value_' + Date.now();
  
  // Set test cookie
  document.cookie = `${testName}=${testValue}; path=/; SameSite=None; Secure`;
  console.log('✅ Set test cookie:', testName, '=', testValue);
  
  // Try to read it back
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + testName + '=([^;]+)'));
  const readValue = match ? decodeURIComponent(match[1]) : null;
  
  if (readValue === testValue) {
    console.log('✅ Successfully read back test cookie');
  } else {
    console.log('❌ Failed to read back test cookie. Got:', readValue);
  }
  
  // Clean up
  document.cookie = `${testName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
  console.log('🧹 Cleaned up test cookie');
}

/**
 * Test the actual shared content detection
 */
function testGetSharedData() {
  console.log('=== TESTING SHARED CONTENT DETECTION ===');
  
  // Import the actual function - this would need to be available
  // For now, we'll inline the logic
  const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[1]) : null;
  };
  
  const sharedPostDataStr = getCookie('shared_post_data');
  console.log('shared_post_data cookie:', sharedPostDataStr);
  
  if (!sharedPostDataStr) {
    console.log('❌ No shared_post_data cookie found');
    return;
  }
  
  try {
    const postData = JSON.parse(sharedPostDataStr);
    console.log('✅ Successfully parsed shared post data:', postData);
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const isValid = (Date.now() - postData.timestamp) < maxAge;
    console.log('🕐 Data validity:', isValid ? '✅ Valid' : '❌ Expired');
    
  } catch (error) {
    console.log('❌ Failed to parse shared post data:', error);
  }
}

/**
 * Manually set a shared cookie for testing
 */
function manuallySetSharedCookie(postId: string, boardId: string) {
  console.log('=== MANUALLY SETTING SHARED COOKIE ===');
  
  const testData = {
    postId,
    boardId,
    token: 'test_token_' + Date.now(),
    timestamp: Date.now()
  };
  
  const cookieValue = JSON.stringify(testData);
  document.cookie = `shared_post_data=${encodeURIComponent(cookieValue)}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
  
  console.log('✅ Set manual shared cookie with data:', testData);
  console.log('🔄 Now refresh the page to test detection');
}

// Initialize cookie debug utilities
if (typeof window !== 'undefined') {
  window.cookieDebug = {
    listAllCookies,
    testSetCookie, 
    testGetSharedData,
    manuallySetSharedCookie
  };
  
  console.log('🍪 Cookie debug utilities loaded! Use window.cookieDebug in console:');
  console.log('  window.cookieDebug.listAllCookies()');
  console.log('  window.cookieDebug.testSetCookie()');
  console.log('  window.cookieDebug.testGetSharedData()');
  console.log('  window.cookieDebug.manuallySetSharedCookie("123", "456")');
}

export {}; // Make this a module 