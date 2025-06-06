# Telegram Registration System Research

## Problem Statement

Current issue: Storing Telegram groups in database before proper registration requires hardcoding community IDs, violating foreign key constraints, and creating poor UX.

## Proposed Solution: Connect Code System

### Overview
Two-phase registration system:
1. **Bot Addition**: Welcome message only, no database storage
2. **Registration**: Use unique connect codes to link groups to communities

### User Flow
```
1. Admin adds bot to Telegram group
   → Bot sends welcome message with /register instructions
   → Nothing stored in database yet

2. Admin goes to Community Settings in web app
   → Sees unique connect code for their community
   → Copies code

3. Admin runs `/register ABC123XYZ` in Telegram group
   → Bot validates code
   → Group registered and activated for notifications
```

## Technical Specification

### Connect Code Generation
```typescript
function generateConnectCode(communityId: string): string {
  const secret = process.env.TELEGRAM_CONNECT_SECRET;
  const nonce = getCurrentTelegramGroupCount(communityId);
  const payload = `${communityId}:${nonce}`;
  
  // Generate deterministic but secure code
  const hash = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
    
  return hash; // e.g., "ABC123XYZ456"
}
```

### Code Validation
```typescript
function validateConnectCode(code: string, communityId: string): boolean {
  const expectedCode = generateConnectCode(communityId);
  return code === expectedCode;
}
```

### Required Environment Variables
```bash
TELEGRAM_CONNECT_SECRET="your-random-secret-for-code-generation"
TELEGRAM_BOT_NAME="Common Ground Bot"  # For UI instructions
```

## Critical Analysis

### ✅ Advantages
1. **No Hardcoding**: Communities are dynamically linked
2. **Secure**: Codes are generated, not guessable
3. **Self-Service**: Admins get their own codes
4. **Clean Database**: No orphaned records
5. **Scalable**: Works for any number of communities
6. **Abuse Prevention**: Nonce prevents unlimited registrations

### ⚠️ Potential Issues

#### 1. **Nonce-Based Limitation**
**Issue**: Nonce prevents multiple group registrations per community
**Impact**: Communities can only register one Telegram group

**Solutions:**
- **A**: Remove nonce, allow unlimited groups per community
- **B**: Use different nonce (timestamp-based)
- **C**: Allow configurable group limit per community

#### 2. **Code Rotation**
**Issue**: Codes never change unless group count changes
**Impact**: Compromised codes remain valid forever

**Solutions:**
- **A**: Add timestamp to code generation (daily rotation)
- **B**: Allow manual code regeneration in UI
- **C**: Use one-time codes (more complex)

#### 3. **User Experience**
**Issue**: Copy/paste codes can be error-prone
**Impact**: Failed registrations, support burden

**Mitigations:**
- Clear UI with copy button
- Code format validation
- Helpful error messages

#### 4. **Community Identification**
**Issue**: Bot doesn't know which community until registration
**Impact**: Can't pre-validate or show community-specific info

**Acceptable**: This is by design for security

## Alternative Approaches

### Alternative 1: JWT Tokens
```typescript
const token = jwt.sign(
  { communityId, exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) },
  secret
);
```
**Pros**: Built-in expiration, standard format
**Cons**: Longer codes, requires JWT library

### Alternative 2: One-Time Codes
```typescript
// Generate random code, store in database with expiration
const code = generateRandomCode();
await storeTemporaryCode(code, communityId, expiresIn24h);
```
**Pros**: Maximum security, automatic expiration
**Cons**: Requires additional database table, more complex

### Alternative 3: Magic Links
```typescript
// Generate URL that redirects to Telegram with pre-filled command
const magicUrl = `https://app.com/telegram-register/${communityId}/${token}`;
```
**Pros**: One-click experience
**Cons**: Complex flow, requires web interaction

## Recommended Implementation

### Phase 1: Simple Hash-Based Codes
- Use proposed hash system
- **Remove nonce** to allow multiple groups per community
- Add timestamp component for daily rotation
- Implement in Community Settings UI

### Phase 2: Enhanced Features (Future)
- Manual code regeneration
- Group management UI
- Usage analytics
- Rate limiting

### Final Code Generation (Recommended)
```typescript
function generateConnectCode(communityId: string): string {
  const secret = process.env.TELEGRAM_CONNECT_SECRET;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const payload = `${communityId}:${today}`;
  
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
}
```

**Benefits:**
- Daily rotation for security
- Multiple groups per community
- Simple implementation
- Deterministic validation

## Implementation Plan

### 1. Environment Variables
User adds:
```bash
TELEGRAM_CONNECT_SECRET="your-random-secret-here"
TELEGRAM_BOT_NAME="Common Ground Bot"
```

### 2. Remove DB Storage from Bot Addition
Update webhook to only send welcome message

### 3. Add Connect Code Generation
Create utility functions for code generation/validation

### 4. Update Registration Command
Modify `/register` to accept and validate codes

### 5. Community Settings UI
Add connect code display with instructions

### 6. Testing
Test full flow: bot addition → code generation → registration

## Security Considerations

1. **Secret Management**: Use strong random secret, rotate periodically
2. **Code Validation**: Always validate server-side
3. **Rate Limiting**: Limit registration attempts per group
4. **Audit Trail**: Log all registration attempts
5. **Revocation**: Ability to disable codes if compromised

## Conclusion

The connect code system is **excellent** - it solves the core problems while maintaining security and UX. The main consideration is removing the nonce to allow multiple groups per community, and adding daily rotation for security.

**Recommendation**: Proceed with implementation using daily-rotating hash-based codes. 