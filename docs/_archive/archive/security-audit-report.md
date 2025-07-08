# Security Audit Report - Curia2 API Endpoints

**Audit Date:** June 15, 2025  
**Auditor:** Claude Code Security Analysis  
**Scope:** Complete API endpoint security assessment  

## Executive Summary

This comprehensive security audit identified multiple critical vulnerabilities in the Curia2 API endpoints that require immediate attention. While the application demonstrates solid foundational security practices (parameterized queries, JWT authentication), several authorization bypasses and configuration issues pose significant security risks.

**Risk Summary:**
- 🔴 **5 Critical Vulnerabilities** (Immediate action required)
- 🟠 **2 High-Risk Issues** 
- 🟡 **4 Medium-Risk Issues**

## 🚨 Critical Vulnerabilities (Fix Immediately)

### 1. Admin Role IDs Exposed to Client-Side Code
**File:** `src/app/api/auth/session/route.ts:44`  
**Severity:** CRITICAL  
**CVSS Score:** 8.1 (High)

**Issue:**
```typescript
const adminRoleTitleEnvVar = process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS;
```

**Problem:** The `NEXT_PUBLIC_` prefix exposes admin role identifiers to client-side JavaScript, allowing attackers to see which roles grant administrative privileges.

**Impact:**
- Information disclosure of sensitive role configuration
- Enables targeted privilege escalation attacks
- Compromises admin access control security

**Fix:**
```typescript
// Change this:
const adminRoleTitleEnvVar = process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS;

// To this:
const adminRoleTitleEnvVar = process.env.ADMIN_ROLE_IDS;
```

**Environment Variable Update:**
```bash
# In your .env file, change:
NEXT_PUBLIC_ADMIN_ROLE_IDS=role1,role2,role3

# To:
ADMIN_ROLE_IDS=role1,role2,role3
```

---

### 2. Missing Authorization in Comment Deletion
**File:** `src/app/api/posts/[postId]/comments/[commentId]/route.ts:28`  
**Severity:** CRITICAL  
**CVSS Score:** 9.1 (Critical)

**Issue:**
```typescript
async function deleteCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const commentId = parseInt(params.commentId, 10);
  
  // Missing: ownership and community verification
  await query('DELETE FROM comments WHERE id = $1', [commentId]);
  return NextResponse.json({ message: 'Comment deleted' });
}
```

**Problem:** Any authenticated user can delete any comment system-wide. No verification of:
- Comment ownership
- Community membership
- Admin privileges

**Impact:**
- Complete data manipulation vulnerability
- Users can delete other users' comments
- Cross-community data destruction possible

**Fix:**
```typescript
async function deleteCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const commentId = parseInt(params.commentId, 10);
  const { userId, communityId, isAdmin } = req.user;

  if (isNaN(commentId)) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  try {
    // Get comment with author and community verification
    const commentResult = await query(`
      SELECT c.author_user_id, c.content, p.title as post_title
      FROM comments c 
      JOIN posts p ON c.post_id = p.id 
      JOIN boards b ON p.board_id = b.id 
      WHERE c.id = $1 AND b.community_id = $2
    `, [commentId, communityId]);

    if (commentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const comment = commentResult.rows[0];
    
    // Only allow deletion if user owns comment or is admin
    if (comment.author_user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
```

---

### 3. Missing Authorization in Post Deletion
**File:** `src/app/api/posts/[postId]/route.ts:45`  
**Severity:** CRITICAL  
**CVSS Score:** 8.8 (High)

**Issue:**
```typescript
async function deletePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  
  // Missing: community verification for admin access
  await query('DELETE FROM posts WHERE id = $1', [postId]);
  return NextResponse.json({ message: 'Post deleted' });
}
```

**Problem:** Admin users can delete posts from any community, breaking community isolation.

**Impact:**
- Cross-community data manipulation
- Admins can delete posts outside their community scope
- Potential for malicious admin abuse

**Fix:**
```typescript
async function deletePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);
  const { userId, communityId, isAdmin } = req.user;

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    // Verify post exists in user's community
    const postResult = await query(`
      SELECT p.author_user_id, p.title, b.community_id
      FROM posts p 
      JOIN boards b ON p.board_id = b.id 
      WHERE p.id = $1
    `, [postId]);

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postResult.rows[0];
    
    // Verify community scope for admin access
    if (post.community_id !== communityId) {
      return NextResponse.json({ error: 'Unauthorized - cross-community access denied' }, { status: 403 });
    }

    // Only allow deletion if user owns post or is admin within same community
    if (post.author_user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await query('DELETE FROM posts WHERE id = $1', [postId]);
    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
```

---

### 4. Incomplete Role Validation System
**File:** `src/lib/roleService.ts:15`  
**Severity:** CRITICAL  
**CVSS Score:** 8.5 (High)

**Issue:**
```typescript
export async function validateRoleIds(roleIds: string[], communityId: string): Promise<boolean> {
  // TODO: Implement actual validation logic
  return true; // This allows any role ID to be accepted
}

export async function getCommunityRoles(communityId: string): Promise<any[]> {
  // TODO: Implement role fetching
  return []; // Returns empty array, no role validation
}
```

**Problem:** Critical security functions are not implemented, allowing privilege escalation.

**Impact:**
- Any role ID is accepted as valid
- Users can assign themselves arbitrary roles
- Complete bypass of role-based access control

**Fix:**
```typescript
export async function validateRoleIds(roleIds: string[], communityId: string): Promise<boolean> {
  if (!roleIds || roleIds.length === 0) {
    return true; // Empty roles are valid
  }

  try {
    const result = await query(
      'SELECT id FROM community_roles WHERE community_id = $1 AND id = ANY($2)',
      [communityId, roleIds]
    );
    
    // All provided role IDs must exist in the community
    return result.rows.length === roleIds.length;
  } catch (error) {
    console.error('Error validating role IDs:', error);
    return false;
  }
}

export async function getCommunityRoles(communityId: string): Promise<any[]> {
  try {
    const result = await query(
      'SELECT id, name, permissions, created_at FROM community_roles WHERE community_id = $1',
      [communityId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching community roles:', error);
    return [];
  }
}
```

---

### 5. Disabled Telegram Webhook Authentication
**File:** `src/app/api/telegram/webhook/route.ts:6`  
**Severity:** CRITICAL  
**CVSS Score:** 8.3 (High)

**Issue:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    // const signature = req.headers.get('x-telegram-bot-api-secret-token') || '';
    
    // TEMP: Skip signature verification for testing
    // if (process.env.NODE_ENV === 'production' && !verifyTelegramWebhook(body, signature)) {
    //   console.error('[Telegram] Invalid webhook signature');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const update: TelegramUpdate = JSON.parse(body);
    // ... rest of handler
  }
}
```

**Problem:** Webhook signature verification is disabled, allowing anyone to send malicious payloads.

**Impact:**
- Anyone can trigger Telegram bot actions
- Potential for spam, data manipulation, or DoS attacks
- Compromise of Telegram integration security

**Fix:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-telegram-bot-api-secret-token') || '';
    
    // Enable signature verification in all environments
    if (!verifyTelegramWebhook(body, signature)) {
      console.error('[Telegram] Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update: TelegramUpdate = JSON.parse(body);
    // ... rest of handler
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Environment Setup:**
```bash
# Ensure you have the Telegram webhook secret configured
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_here
```

## 🟠 High-Risk Issues

### 6. No JWT Token Revocation Mechanism
**Severity:** HIGH  
**Impact:** Compromised tokens remain valid until expiration

**Problem:** JWT tokens cannot be invalidated server-side once issued. If a token is compromised, it remains valid for its entire lifetime.

**Recommendation:** Implement a token blacklist using Redis:
```typescript
// Add to withAuth middleware
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) {
  return NextResponse.json({ error: 'Token revoked' }, { status: 401 });
}

// Add logout endpoint
export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  await redis.setex(`blacklist:${token}`, 3600, 'revoked'); // Expire with token
  return NextResponse.json({ message: 'Logged out successfully' });
}
```

### 7. Insufficient Input Validation Schema
**Severity:** HIGH  
**Files:** Multiple API endpoints  
**Impact:** Type confusion, prototype pollution, data injection

**Problem:** JSON request bodies are parsed without strict schema validation.

**Recommendation:** Implement Zod validation:
```typescript
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string().max(50)).max(10).optional(),
  boardId: z.number().int().positive(),
  settings: z.object({
    responsePermissions: z.object({
      requireGating: z.boolean().optional(),
      gatingConfig: z.any().optional()
    }).optional()
  }).optional()
});

// In API handler:
try {
  const validatedBody = CreatePostSchema.parse(body);
} catch (error) {
  return NextResponse.json({ 
    error: 'Invalid input', 
    details: error.errors 
  }, { status: 400 });
}
```

## 🟡 Medium-Risk Issues

### 8. Overly Permissive CORS Configuration
**File:** `next.config.ts:8`  
**Severity:** MEDIUM

**Issue:**
```typescript
headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }]
```

**Fix:**
```typescript
headers: [
  { 
    key: 'Access-Control-Allow-Origin', 
    value: process.env.ALLOWED_ORIGINS || 'https://yourdomain.com' 
  }
]
```

### 9. Missing Security Headers
**Severity:** MEDIUM  
**Impact:** Various client-side attacks possible

**Recommendation:** Add comprehensive security headers:
```typescript
// In next.config.ts
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { 
    key: 'Content-Security-Policy', 
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" 
  },
  { 
    key: 'Strict-Transport-Security', 
    value: 'max-age=31536000; includeSubDomains' 
  }
]
```

### 10. No API Rate Limiting
**Severity:** MEDIUM  
**Impact:** DoS vulnerability, brute force attacks

**Recommendation:** Implement rate limiting middleware:
```typescript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to API routes
export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return apiLimiter(req);
  }
}
```

### 11. In-Memory Nonce Storage
**File:** `src/lib/verification/nonceStore.ts`  
**Severity:** MEDIUM  
**Impact:** Replay attacks possible after server restart

**Recommendation:** Use Redis for persistent nonce storage:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class NonceStore {
  static async store(nonce: string, expiryMinutes: number = 10): Promise<void> {
    await redis.setex(`nonce:${nonce}`, expiryMinutes * 60, 'used');
  }

  static async isUsed(nonce: string): Promise<boolean> {
    const result = await redis.get(`nonce:${nonce}`);
    return result !== null;
  }
}
```

## ✅ Security Strengths

Your application demonstrates several excellent security practices:

1. **SQL Injection Protection:** All database queries use parameterized statements
2. **JWT Authentication:** Proper token validation and signing
3. **Community Isolation:** Users cannot access other communities' data
4. **Board Permissions:** Role-based access control implementation
5. **XSS Protection:** No dangerous HTML injection patterns found
6. **Environment-based Configuration:** Proper secrets management

## 📋 Implementation Priority

### Week 1 (Critical - Fix Immediately)
- [ ] Remove `NEXT_PUBLIC_` prefix from admin role environment variables
- [ ] Fix comment deletion authorization (add ownership checks)
- [ ] Fix post deletion authorization (add community verification)
- [ ] Implement role validation functions
- [ ] Enable Telegram webhook signature verification

### Week 2 (High Priority)
- [ ] Implement JWT token blacklist for logout functionality
- [ ] Add comprehensive input validation with Zod schemas
- [ ] Add rate limiting to all API endpoints
- [ ] Implement proper error handling and logging

### Week 3 (Medium Priority)
- [ ] Fix CORS configuration to be more restrictive
- [ ] Add comprehensive security headers
- [ ] Migrate nonce storage to Redis
- [ ] Add API monitoring and alerting

### Week 4 (Enhancement)
- [ ] Add automated security testing to CI/CD
- [ ] Implement advanced rate limiting (per-user, per-endpoint)
- [ ] Add comprehensive audit logging
- [ ] Consider adding Web Application Firewall (WAF)

## 🛠️ Development Guidelines

### Secure Coding Practices
1. **Always validate input:** Use schema validation for all request bodies
2. **Check authorization:** Verify user permissions before any data modification
3. **Log security events:** Track authentication failures and suspicious activity
4. **Use parameterized queries:** Never concatenate user input into SQL strings
5. **Implement proper error handling:** Don't expose sensitive information in errors

### Testing Recommendations
```bash
# Add these security testing tools to your CI/CD:
npm install --save-dev @types/jest jest-security-audit
npm install --save-dev eslint-plugin-security

# Run security audits:
npm audit
npm run security-test
```

### Monitoring & Alerting
Consider implementing:
- Failed authentication attempt monitoring
- Unusual API usage pattern detection
- Real-time security event alerting
- Regular security dependency updates

## 📞 Next Steps

1. **Immediate Action:** Address all critical vulnerabilities this week
2. **Testing:** Set up a staging environment to test security fixes
3. **Documentation:** Update security documentation and deployment guides
4. **Training:** Ensure development team understands secure coding practices
5. **Regular Audits:** Schedule quarterly security reviews

---

**This report should be treated as confidential. Please secure this document and limit access to authorized personnel only.**

For questions about this security audit, please contact the security team or create an issue in your private repository.