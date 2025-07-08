# AI Compliance Enforcement System
## Multi-Level Content Moderation & Rule Enforcement

### Overview
Implementation of a three-tier AI-powered compliance system that enforces content rules at different organizational levels while maintaining the existing style & grammar improvement functionality.

---

## System Architecture

### 1. Three-Tier Rule Hierarchy

#### **Level 1: Hoster Rules (Platform-wide)**
- **Source**: Environment variable
- **Scope**: All communities, all boards, all content
- **Purpose**: Platform-wide content policies (legal compliance, ToS violations, etc.)
- **Managed by**: Platform operator/hosting entity
- **Examples**: "No hate speech", "No illegal content", "No doxxing"

#### **Level 2: Community Rules (Community-wide)**
- **Source**: `communities.settings.ai.complianceRules`
- **Scope**: All boards within the community
- **Purpose**: Community-specific guidelines and culture enforcement
- **Managed by**: Community administrators
- **Examples**: "Keep discussions technical", "No price speculation", "English only"

#### **Level 3: Board Rules (Board-specific)**
- **Source**: `boards.settings.ai.complianceRules`
- **Scope**: Specific board only
- **Purpose**: Topic-specific rules and discussion guidelines
- **Managed by**: Community administrators (board-level settings)
- **Examples**: "Bug reports only", "Include code examples", "No duplicate posts"

### 2. Rule Application Strategy

#### **Cascading Enforcement Model**
All applicable rules are enforced simultaneously:
- Platform rules + Community rules + Board rules = Combined compliance check
- Violations at any level result in enforcement action
- More specific rules don't override broader ones (additive model)

#### **Rule Conflict Resolution**
- No conflicts expected since rules are additive
- If contradictory rules exist, most restrictive applies
- Clear admin UI warnings for potential conflicts

---

## AI Bouncer Architecture

### Core Concept
The AI compliance system acts as a **"bouncer"** that sits in front of the post creation pipeline, similar to the existing crypto credentials bouncer (locks system). All content must pass AI compliance checks before posting is allowed.

### Architecture Decision: Enhanced Validation Pipeline
**Recommended Approach**: Integrate AI compliance into the existing post validation flow rather than creating a separate pre-verification table.

```typescript
// Enhanced post validation sequence
async function validatePostCreation(postData: CreatePostRequest) {
  // 1. Existing validations
  await validateUserPermissions(user, board);
  await validateLockRequirements(user, board.locks);
  
  // 2. NEW: AI Compliance validation (blocking)
  const complianceResult = await validateAICompliance(
    postData.content, 
    postData.communityId, 
    postData.boardId
  );
  
  if (!complianceResult.compliant) {
    throw new ComplianceViolationError(complianceResult.violations);
  }
  
  // 3. Proceed with post creation
  return createPost(postData);
}
```

### Key Architectural Considerations

#### **1. Reliability & Fallback Strategies**
- **Problem**: AI service down = no one can post
- **Solution**: Configurable fallback modes:
  - `strict`: Block all posts if AI unavailable 
  - `permissive`: Allow posts if AI unavailable
  - `admin-only`: Only admins can post if AI unavailable

#### **2. Performance & Caching**
- **Problem**: Every post requires AI analysis
- **Solutions**:
  - Content hash-based caching (same content = cached result)
  - Rule change invalidation
  - Background pre-processing for common violations

#### **3. User Experience & Draft Handling**
- **Problem**: Users lose work when blocked
- **Solutions**:
  - Auto-save drafts during compliance review
  - Clear violation explanations with suggested fixes
  - Progressive disclosure (show worst violations first)

#### **4. Appeal & Override Mechanisms**
- **Problem**: AI false positives block legitimate content
- **Solutions**:
  - Admin override capability
  - User appeal workflow  
  - Violation confidence thresholds
  - Community-specific AI sensitivity settings

---

## Technical Implementation

### 1. Data Schema Extensions

#### Environment Variable
```bash
# .env file
HOSTER_COMPLIANCE_RULES="No hate speech, harassment, or illegal content. Respect intellectual property rights. No spam or excessive self-promotion."
```

#### Database Schema Updates
```typescript
// communities.settings extension
interface CommunitySettings {
  ai?: {
    postImprovement?: { /* existing */ };
    complianceRules?: {
      enabled: boolean;
      rules: string;  // Text blob of rules
      enforcementLevel: 'strict' | 'moderate' | 'lenient';
      lastUpdatedBy: string;
      lastUpdatedAt: string;
    };
  };
}

// boards.settings extension  
interface BoardSettings {
  ai?: {
    complianceRules?: {
      enabled: boolean;
      rules: string;  // Text blob of rules
      enforcementLevel: 'strict' | 'moderate' | 'lenient';
      inheritCommunityRules: boolean;
      lastUpdatedBy: string;
      lastUpdatedAt: string;
    };
  };
}
```

### 2. AI Integration Architecture

#### **Dual-Track AI Processing**
```
User submits content
     ↓
1. Compliance Check (blocking)
   - Aggregate all applicable rules
   - AI analyzes for violations
   - BLOCK if violations found
     ↓
2. Style & Grammar Improvement (optional)
   - AI suggests improvements
   - User reviews and chooses
   - Submit final content
```

#### **Alternative: Single-Track with Separation**
```
User submits content
     ↓
Single AI call with dual purpose:
- Primary: Check compliance (pass/fail)
- Secondary: Suggest style improvements
     ↓
Present results appropriately:
- Compliance violations = blocking
- Style suggestions = optional
```

### 3. API Enhancements

#### New Compliance Check Endpoint
```typescript
POST /api/ai/compliance-check
{
  content: string;
  communityId: string;
  boardId?: string;
  contentType: 'post' | 'comment';
}

Response:
{
  compliant: boolean;
  violations?: Array<{
    rule: string;
    level: 'hoster' | 'community' | 'board';
    severity: 'high' | 'medium' | 'low';
    reason: string;
    suggestedFix?: string;
  }>;
  confidence: number;
}
```

#### Enhanced Improvement Endpoint
```typescript
POST /api/ai/improve (enhanced)
{
  content: string;
  type: 'post' | 'comment';
  checkCompliance: boolean;  // New flag
  communityId: string;
  boardId?: string;
}
```

---

## User Experience Design

### 1. Content Creation Flow

#### **Compliant Content Path**
```
Draft → Compliance Check (pass) → Style Improvement → Post
```

#### **Non-Compliant Content Path**
```
Draft → Compliance Check (fail) → 
  Show violations with explanations →
  User edits → Re-check → Continue
```

### 2. Admin Management Interfaces

#### **Community Settings Page**
- New "Content Rules" section
- Text area for rule definition
- Enforcement level selector
- Preview/test functionality
- Rule history/audit log

#### **Board Settings Page**  
- Similar interface to community level
- Option to inherit community rules
- Board-specific additions
- Visual hierarchy indicator

### 3. Violation Handling UX

#### **Compliance Modal (blocking)**
```
❌ Content Policy Violation
Your content violates the following rules:

🌐 Platform Rule: No hate speech
   Reason: Content contains discriminatory language
   Suggestion: Remove offensive terms and rephrase respectfully

🏠 Community Rule: Keep discussions technical
   Reason: Off-topic personal discussion detected
   Suggestion: Focus on the technical aspects of your question

[Edit Content] [Learn More] [Cancel]
```

#### **Style Improvement Modal (optional)**
```
✨ AI Suggested Improvements
Your content follows all rules! Here are some optional improvements:
[Normal diff viewer interface]
```

---

## Implementation Roadmap

### **Phase 1: Core Infrastructure (Week 1)**
- [x] Environment variable setup
- [x] **COMPLETED**: TypeScript interfaces for compliance rules in settings
- [x] **COMPLETED**: Rule aggregation utility (hoster + community + board) 
- [ ] Enhanced AI prompt template for dual-purpose analysis

### **Phase 2: AI Bouncer Architecture (Week 1-2)**
- [ ] Compliance validation service (blocking)
- [ ] Integration with existing post validation pipeline  
- [ ] Enhanced `/api/ai/improve` for compliance + style analysis
- [ ] Fallback strategies (AI service unavailable)
- [ ] Content caching/memoization for performance

### **Phase 3: Enhanced UX Flow (Week 2)**
- [ ] Enhanced DiffViewer with change categorization
- [ ] Compliance violation modal (blocking)
- [ ] Visual indicators for different change types
- [ ] Hover/click explanations for violations
- [ ] Draft saving for compliance fixes

### **Phase 4: Admin Interfaces (Week 2-3)**
- [ ] Community settings compliance rules UI
- [ ] Board settings compliance rules UI  
- [ ] Rule testing/preview functionality
- [ ] Admin override mechanisms
- [ ] Compliance analytics dashboard

### **Phase 5: Advanced Features (Week 3-4)**
- [ ] Appeal system for false positives
- [ ] Performance optimization and caching
- [ ] Audit logging and compliance reporting
- [ ] A/B testing framework for rule effectiveness
- [ ] Bulk content analysis tools

---

## Key Design Decisions

### 1. **Separation of Concerns**
**Recommendation**: Keep compliance and style improvement as separate processes
- **Compliance**: Blocking, binary pass/fail, focuses on rule violations
- **Style**: Optional, subjective improvements, focuses on quality enhancement
- **Rationale**: Different purposes, different user mental models, different consequences

### 2. **Enforcement Philosophy**
**Recommendation**: Cascading enforcement (all rules apply)
- More predictable for users
- Clearer admin responsibility model
- Easier to implement and debug

### 3. **AI Architecture**
**Recommendation**: Single AI call with dual-purpose prompting
- More efficient (one API call vs two)
- Better context sharing between tasks
- Easier to maintain consistency

### 4. **Rule Storage Format**
**Recommendation**: Simple text blobs initially
- Easiest to implement and maintain
- Natural language is more flexible than structured rules
- Can evolve to structured format later if needed

---

## Technical Considerations

### 1. **Performance**
- Rule aggregation must be fast (database-level joins)
- AI calls should be optimized (single call when possible)
- Caching strategies for frequently-used rule sets

### 2. **Security**
- Rule modification audit logging
- Admin permission validation
- Content sanitization for rule definitions

### 3. **Scalability**
- Rule compilation/caching for high-volume communities
- AI rate limiting and fallback strategies
- Async processing for non-blocking user experience

---

## Environment Variable Specification

**Required Environment Variable:**
```bash
HOSTER_COMPLIANCE_RULES="No hate speech, harassment, doxxing, or illegal content. Respect intellectual property rights. No spam, excessive self-promotion, or coordinated inauthentic behavior. Content must comply with applicable laws and platform terms of service."
```

**Optional Configuration Variables:**
```bash
COMPLIANCE_ENFORCEMENT_LEVEL="strict"  # strict | moderate | lenient
COMPLIANCE_AI_MODEL="gpt-4o-mini"      # AI model for compliance checks
COMPLIANCE_CONFIDENCE_THRESHOLD=0.8    # Confidence threshold for violations
```

---

## Success Metrics

### 1. **Effectiveness**
- Reduction in manually reported content violations
- Consistency of rule enforcement across communities
- User satisfaction with content guidelines

### 2. **Usability**
- Admin adoption rate of rule configuration
- Time to configure rules (should be < 5 minutes)
- User comprehension of violation explanations

### 3. **Performance**
- Compliance check latency (target: < 2 seconds)
- False positive rate (target: < 5%)
- System reliability and uptime

---

## Immediate Next Steps (Phase 1)

### **Step 1: TypeScript Interfaces & Types**
Create proper types for compliance rules in existing JSONB settings fields:

```typescript
// types/settings.ts - extend existing interfaces
interface CommunityAISettings {
  postImprovement?: PostImprovementSettings; // existing
  complianceRules?: {
    enabled: boolean;
    rules: string;
    enforcementLevel: 'strict' | 'moderate' | 'lenient';
    fallbackMode: 'strict' | 'permissive' | 'admin-only';
    lastUpdatedBy: string;
    lastUpdatedAt: string;
  };
}

interface BoardAISettings {
  complianceRules?: {
    enabled: boolean;
    rules: string;
    enforcementLevel: 'strict' | 'moderate' | 'lenient';
    inheritCommunityRules: boolean;
    lastUpdatedBy: string;
    lastUpdatedAt: string;
  };
}
```

### **Step 2: Rule Aggregation Utility**
Create service to combine rules from all sources:

```typescript
// services/ComplianceService.ts
export class ComplianceService {
  static async getApplicableRules(
    communityId: string, 
    boardId?: string
  ): Promise<{
    hosterRules: string;
    communityRules: string;
    boardRules: string;
    combinedPrompt: string;
    enforcementLevel: 'strict' | 'moderate' | 'lenient';
  }> {
    // Implementation here
  }
}
```

### **Step 3: Enhanced AI Prompt Template**
Update AI prompts to handle dual-purpose analysis:

```typescript
// prompts/compliancePrompts.ts
export function createComplianceAnalysisPrompt(
  content: string,
  rules: string,
  type: 'post' | 'comment'
): string {
  // Prompt that analyzes for both compliance violations AND style improvements
}
```

**Ready to start with Step 1 (TypeScript interfaces)?** This establishes the foundation without touching any existing functionality yet. 