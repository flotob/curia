# Phase A: AI Bouncer Integration - Implementation Roadmap

## Overview
Integrate the AI compliance system into the existing post creation pipeline as a "bouncer" that validates content before posting, while enhancing the existing AI improvement system to handle both compliance violations (blocking) and style improvements (optional).

---

## Step-by-Step Implementation Plan

### **Step A1: Enhanced AI Endpoint (Duration: 2-3 hours)**

#### **Goal**
Modify `/api/ai/improve` to support dual-purpose analysis: compliance checking + style improvement.

#### **Technical Implementation**

##### **A1.1: Update AI Request Interface**
**File**: `src/app/api/ai/improve/route.ts`

```typescript
// Add new request body interface
interface ImproveRequest {
  content: string;
  title?: string;
  communityId: string;
  boardId?: string;
  checkCompliance?: boolean;  // NEW: Enable compliance checking
  contentType?: 'post' | 'comment';  // NEW: Content type
}

// Add compliance result to response
interface ImproveResponse {
  success: boolean;
  data?: {
    improvedContent: string;
    summary: string;
    confidence: number;
    hasSignificantChanges: boolean;
    // NEW: Compliance data
    complianceCheck?: {
      compliant: boolean;
      violations: ComplianceViolation[];
      confidence: number;
      enforcementLevel: string;
    };
  };
  error?: string;
}
```

##### **A1.2: Implement Dual-Purpose AI Analysis**
**File**: `src/app/api/ai/improve/route.ts`

```typescript
import { ComplianceService } from '@/services/ComplianceService';

// Enhanced prompt generation
function createDualPurposePrompt(
  content: string,
  title: string,
  aggregatedRules: AggregatedComplianceRules | null
): string {
  const basePrompt = `Analyze the following content for both compliance and style improvements...`;
  
  if (aggregatedRules?.hasAnyRules) {
    return `${basePrompt}
    
COMPLIANCE RULES TO CHECK:
${aggregatedRules.combinedPrompt}

ENFORCEMENT LEVEL: ${aggregatedRules.enforcementLevel}

Return JSON with both compliance violations AND style improvements...`;
  }
  
  return basePrompt; // Style-only analysis
}

// Main handler enhancement
export async function POST(request: Request) {
  // ... existing code ...
  
  // NEW: Get compliance rules if enabled
  let aggregatedRules: AggregatedComplianceRules | null = null;
  if (checkCompliance) {
    // Fetch community and board settings from database
    const { communitySettings, boardSettings } = await fetchSettingsForCompliance(communityId, boardId);
    
    if (ComplianceService.shouldPerformComplianceCheck(communitySettings, boardSettings)) {
      aggregatedRules = ComplianceService.getApplicableRulesFromSettings(communitySettings, boardSettings);
    }
  }
  
  // Enhanced AI analysis
  const prompt = createDualPurposePrompt(content, title, aggregatedRules);
  const aiResponse = await callAI(prompt);
  
  // Parse dual response
  const { complianceViolations, styleImprovements } = parseAIResponse(aiResponse);
  
  return Response.json({
    success: true,
    data: {
      improvedContent: styleImprovements.content,
      summary: styleImprovements.summary,
      confidence: styleImprovements.confidence,
      hasSignificantChanges: styleImprovements.hasChanges,
      complianceCheck: aggregatedRules ? {
        compliant: complianceViolations.length === 0,
        violations: complianceViolations,
        confidence: aggregatedRules.confidenceThreshold,
        enforcementLevel: aggregatedRules.enforcementLevel
      } : undefined
    }
  });
}
```

##### **A1.3: Add Settings Fetching Utility**
**File**: `src/app/api/ai/improve/route.ts`

```typescript
async function fetchSettingsForCompliance(communityId: string, boardId?: string) {
  const db = await getDb();
  
  // Fetch community settings
  const communityResult = await db.query(
    'SELECT settings FROM communities WHERE id = $1',
    [communityId]
  );
  
  const communitySettings = communityResult.rows[0]?.settings || {};
  
  // Fetch board settings if boardId provided
  let boardSettings = {};
  if (boardId) {
    const boardResult = await db.query(
      'SELECT settings FROM boards WHERE id = $1 AND community_id = $2',
      [boardId, communityId]
    );
    boardSettings = boardResult.rows[0]?.settings || {};
  }
  
  return { communitySettings, boardSettings };
}
```

---

### **Step A2: Post Validation Pipeline Integration (Duration: 2-3 hours)**

#### **Goal**
Integrate AI compliance checking into the existing post creation validation pipeline.

#### **Technical Implementation**

##### **A2.1: Create AI Compliance Validation Function**
**File**: `src/lib/validation/aiCompliance.ts`

```typescript
import { ComplianceService, type ComplianceCheckResult } from '@/services/ComplianceService';
import { SettingsUtils } from '@/types/settings';

export interface AIComplianceValidationResult {
  valid: boolean;
  violations: ComplianceViolation[];
  fallbackMode?: 'strict' | 'permissive' | 'admin-only';
  bypassReason?: string;
}

export async function validateAICompliance(
  content: string,
  title: string,
  communityId: string,
  boardId?: string,
  userIsAdmin: boolean = false
): Promise<AIComplianceValidationResult> {
  try {
    // Fetch settings
    const { communitySettings, boardSettings } = await fetchSettingsForCompliance(communityId, boardId);
    
    // Check if compliance checking is enabled
    if (!ComplianceService.shouldPerformComplianceCheck(communitySettings, boardSettings)) {
      return {
        valid: true,
        violations: [],
        bypassReason: 'No compliance rules configured'
      };
    }
    
    // Get aggregated rules
    const aggregatedRules = ComplianceService.getApplicableRulesFromSettings(communitySettings, boardSettings);
    
    // Call AI compliance check endpoint
    const response = await fetch('/api/ai/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `${title}\n\n${content}`,
        communityId,
        boardId,
        checkCompliance: true,
        contentType: 'post'
      })
    });
    
    if (!response.ok) {
      throw new Error('AI service unavailable');
    }
    
    const result = await response.json();
    
    if (result.data?.complianceCheck) {
      return {
        valid: result.data.complianceCheck.compliant,
        violations: result.data.complianceCheck.violations || []
      };
    }
    
    throw new Error('Invalid AI response format');
    
  } catch (error) {
    console.error('AI compliance check failed:', error);
    
    // Handle AI service unavailable
    const fallbackResult = ComplianceService.handleAIServiceUnavailable(
      aggregatedRules?.fallbackMode || 'permissive',
      userIsAdmin
    );
    
    return {
      valid: fallbackResult.compliant,
      violations: fallbackResult.violations,
      fallbackMode: fallbackResult.fallbackMode
    };
  }
}
```

##### **A2.2: Integrate into Post Creation Endpoint**
**File**: `src/app/api/posts/route.ts`

```typescript
import { validateAICompliance } from '@/lib/validation/aiCompliance';

export async function POST(request: Request) {
  // ... existing validation code ...
  
  // NEW: AI Compliance validation (after existing validations)
  const complianceResult = await validateAICompliance(
    content,
    title,
    communityId,
    board.id,
    userIsAdmin  // TODO: Determine admin status
  );
  
  if (!complianceResult.valid) {
    return Response.json({
      error: 'Content violates community guidelines',
      type: 'COMPLIANCE_VIOLATION',
      violations: complianceResult.violations,
      fallbackMode: complianceResult.fallbackMode
    }, { status: 400 });
  }
  
  // Continue with post creation...
}
```

##### **A2.3: Update Post Validation Endpoint**
**File**: `src/app/api/posts/validate/route.ts`

```typescript
// Add compliance checking to validation endpoint
export async function POST(request: Request) {
  // ... existing validation logic ...
  
  // Add AI compliance validation
  const complianceResult = await validateAICompliance(
    content,
    title,
    communityId,
    boardId,
    userIsAdmin
  );
  
  return Response.json({
    valid: allValidationsPassed && complianceResult.valid,
    errors: [
      ...existingErrors,
      ...(complianceResult.valid ? [] : [{
        type: 'COMPLIANCE_VIOLATION',
        message: 'Content violates community guidelines',
        violations: complianceResult.violations
      }])
    ]
  });
}
```

---

### **Step A3: Compliance Violation UI Components (Duration: 3-4 hours)**

#### **Goal**
Create UI components to handle compliance violations with clear explanations and suggested fixes.

#### **Technical Implementation**

##### **A3.1: Create ComplianceViolationModal**
**File**: `src/components/ai/ComplianceViolationModal.tsx`

```typescript
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { ComplianceViolation } from '@/services/ComplianceService';

interface ComplianceViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueEditing: () => void;
  violations: ComplianceViolation[];
  enforcementLevel: 'strict' | 'moderate' | 'lenient';
  fallbackMode?: 'strict' | 'permissive' | 'admin-only';
}

export function ComplianceViolationModal({
  isOpen,
  onClose,
  onContinueEditing,
  violations,
  enforcementLevel,
  fallbackMode
}: ComplianceViolationModalProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'hoster': return 'bg-red-100 text-red-800';
      case 'community': return 'bg-blue-100 text-blue-800';
      case 'board': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Content Policy Violation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {fallbackMode && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Content moderation system is temporarily unavailable. 
                {fallbackMode === 'strict' && 'All posts are currently blocked for review.'}
                {fallbackMode === 'admin-only' && 'Only administrators can post at this time.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your content violates the following guidelines and cannot be posted:
            </p>

            {violations.map((violation, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(violation.severity)}>
                      {violation.severity} severity
                    </Badge>
                    <Badge className={getLevelBadgeColor(violation.level)}>
                      {violation.level === 'hoster' && '🌐 Platform'}
                      {violation.level === 'community' && '🏠 Community'}
                      {violation.level === 'board' && '📋 Board'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {violation.confidence}% confidence
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-1">Rule Violated:</h4>
                  <p className="text-sm">{violation.rule}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-1">Explanation:</h4>
                  <p className="text-sm text-muted-foreground">{violation.reason}</p>
                </div>

                {violation.suggestedFix && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Suggested Fix:</h4>
                    <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      {violation.suggestedFix}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onContinueEditing}>
              Edit Content
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

##### **A3.2: Enhanced Change Categorization for DiffViewer**
**File**: `src/utils/diffUtils.ts` (extend existing)

```typescript
// Add change categorization
export interface CategorizedChange {
  type: 'compliance-fix' | 'style-improvement' | 'grammar-fix';
  line: number;
  description: string;
  reason?: string;
  severity?: 'high' | 'medium' | 'low';
}

export interface EnhancedDiffResult {
  sideBySideDiff: SideBySideDiff;
  inlineDiff: InlineDiff;
  categorizedChanges: CategorizedChange[];
  hasComplianceViolations: boolean;
  hasStyleImprovements: boolean;
}

// Function to analyze and categorize changes
export function analyzeChanges(
  originalContent: string,
  improvedContent: string,
  complianceViolations?: ComplianceViolation[]
): EnhancedDiffResult {
  const sideBySideDiff = generateSideBySideDiff(originalContent, improvedContent);
  const inlineDiff = generateInlineDiff(originalContent, improvedContent);
  
  // Categorize changes based on AI response and violations
  const categorizedChanges: CategorizedChange[] = [];
  
  // Map violations to specific line changes
  if (complianceViolations) {
    complianceViolations.forEach(violation => {
      // TODO: Map violations to specific lines in diff
      categorizedChanges.push({
        type: 'compliance-fix',
        line: 0, // Will be calculated
        description: violation.reason,
        reason: violation.rule,
        severity: violation.severity
      });
    });
  }
  
  return {
    sideBySideDiff,
    inlineDiff,
    categorizedChanges,
    hasComplianceViolations: !!complianceViolations?.length,
    hasStyleImprovements: hasMeaningfulChanges(originalContent, improvedContent)
  };
}
```

##### **A3.3: Enhanced DiffViewer with Change Categories**
**File**: `src/components/ai/DiffViewer.tsx` (enhance existing)

```typescript
// Add props for categorized changes
interface DiffViewerProps {
  originalContent: string;
  improvedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit?: () => void;
  categorizedChanges?: CategorizedChange[];
  hasComplianceViolations?: boolean;
}

// Add change category indicators
const renderChangeWithCategory = (content: string, change?: CategorizedChange) => {
  if (!change) return content;
  
  const categoryIcons = {
    'compliance-fix': '🚫',
    'style-improvement': '✨',
    'grammar-fix': '✅'
  };
  
  return (
    <span 
      className="relative group"
      title={`${change.description} (${change.reason})`}
    >
      {content}
      <span className="ml-1 text-xs">
        {categoryIcons[change.type]}
      </span>
    </span>
  );
};

// Update action buttons based on compliance violations
const renderActionButtons = () => {
  if (hasComplianceViolations) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReject}>
          Cancel
        </Button>
        <Button variant="outline" onClick={onEdit}>
          Edit Further
        </Button>
        <Button onClick={onAccept} className="bg-red-600 hover:bg-red-700">
          Accept Compliance Fixes
        </Button>
      </div>
    );
  }
  
  // Standard style improvement buttons
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onReject}>
        Keep Original
      </Button>
      <Button onClick={onAccept}>
        Accept Improvements
      </Button>
    </div>
  );
};
```

---

### **Step A4: Enhanced PostImprovementModal Integration (Duration: 2-3 hours)**

#### **Goal**
Update the existing PostImprovementModal to handle compliance violations as blocking issues while keeping style improvements as optional.

#### **Technical Implementation**

##### **A4.1: Update PostImprovementModal State Management**
**File**: `src/components/ai/PostImprovementModal.tsx`

```typescript
// Add compliance-related state
const [complianceViolations, setComplianceViolations] = useState<ComplianceViolation[]>([]);
const [hasComplianceViolations, setHasComplianceViolations] = useState(false);
const [enforcementLevel, setEnforcementLevel] = useState<'strict' | 'moderate' | 'lenient'>('moderate');
const [showComplianceModal, setShowComplianceModal] = useState(false);

// Update the improveContent function
const improveContent = useCallback(async () => {
  if (!originalContent.trim()) return;
  
  setIsImproving(true);
  setError('');
  
  try {
    const response = await fetch('/api/ai/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: originalContent,
        title: originalTitle,
        communityId,
        boardId,
        checkCompliance: true,  // Always check compliance
        contentType: 'post'
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // Handle compliance violations
      if (result.data.complianceCheck) {
        setHasComplianceViolations(!result.data.complianceCheck.compliant);
        setComplianceViolations(result.data.complianceCheck.violations || []);
        setEnforcementLevel(result.data.complianceCheck.enforcementLevel || 'moderate');
        
        // If violations found, show compliance modal instead
        if (!result.data.complianceCheck.compliant) {
          setShowComplianceModal(true);
          setIsImproving(false);
          return;
        }
      }
      
      // Handle style improvements (only if no compliance violations)
      setImprovedContent(result.data.improvedContent);
      setImprovementSummary(result.data.summary);
      setConfidence(result.data.confidence);
      
      const meaningful = hasMeaningfulChanges(originalContent, result.data.improvedContent);
      setHasChanges(meaningful);
      
      if (!meaningful) {
        // Content is already great - auto-submit
        setIsAutoSubmitting(true);
        setTimeout(() => {
          onSubmitOriginal();
        }, 1500);
      }
    }
  } catch (error) {
    console.error('AI improvement failed:', error);
    setError('Unable to analyze content. Please try again.');
  } finally {
    setIsImproving(false);
  }
}, [originalContent, originalTitle, communityId, boardId, onSubmitOriginal]);
```

##### **A4.2: Add Compliance Modal Integration**
**File**: `src/components/ai/PostImprovementModal.tsx`

```typescript
// Add compliance modal to the render
return (
  <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Existing modal content */}
    </Dialog>
    
    <ComplianceViolationModal
      isOpen={showComplianceModal}
      onClose={() => {
        setShowComplianceModal(false);
        onClose(); // Close parent modal too
      }}
      onContinueEditing={() => {
        setShowComplianceModal(false);
        // Keep parent modal open for editing
      }}
      violations={complianceViolations}
      enforcementLevel={enforcementLevel}
    />
  </>
);
```

##### **A4.3: Update ExpandedNewPostForm Integration**
**File**: `src/components/voting/ExpandedNewPostForm.tsx`

```typescript
// Update to handle compliance violations in form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate post first
  const validationResponse = await fetch('/api/posts/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      content,
      communityId,
      boardId
    })
  });
  
  const validation = await validationResponse.json();
  
  if (!validation.valid) {
    // Check for compliance violations specifically
    const complianceError = validation.errors.find(
      (error: any) => error.type === 'COMPLIANCE_VIOLATION'
    );
    
    if (complianceError) {
      // Show AI improvement modal which will handle compliance
      setShowAIModal(true);
      return;
    }
    
    // Handle other validation errors normally
    setValidationErrors(validation.errors);
    return;
  }
  
  // If validation passed, check if AI improvement is enabled
  if (isAIPostImprovementEnabled) {
    setShowAIModal(true);
  } else {
    // Submit directly
    await submitPost();
  }
};
```

---

### **Step A5: Integration Testing & Polish (Duration: 2-3 hours)**

#### **Goal**
Test the complete integration, handle edge cases, and polish the user experience.

#### **Technical Implementation**

##### **A5.1: Create Integration Tests**
**File**: `src/__tests__/ai-bouncer-integration.test.ts`

```typescript
describe('AI Bouncer Integration', () => {
  test('should block post with compliance violations', async () => {
    // Test compliance violation blocking
  });
  
  test('should allow post with only style improvements', async () => {
    // Test style-only improvements
  });
  
  test('should handle AI service unavailable gracefully', async () => {
    // Test fallback modes
  });
  
  test('should respect enforcement levels', async () => {
    // Test strict vs lenient enforcement
  });
});
```

##### **A5.2: Error Handling & Edge Cases**
- **AI API timeouts**: Implement proper timeout handling
- **Malformed AI responses**: Add robust parsing with fallbacks
- **Database connection issues**: Graceful degradation
- **Rate limiting**: Implement request queuing
- **Content length limits**: Handle very long posts

##### **A5.3: Performance Optimizations**
- **Rule caching**: Cache aggregated rules per community/board
- **AI response caching**: Cache compliance checks for identical content
- **Async processing**: Non-blocking compliance checks where possible
- **Database query optimization**: Efficient settings fetching

##### **A5.4: User Experience Polish**
- **Loading states**: Clear feedback during AI processing
- **Progress indicators**: Show compliance check progress
- **Helpful error messages**: Clear guidance on fixing violations
- **Accessibility**: Proper ARIA labels and keyboard navigation

---

## Implementation Dependencies

### **Required Environment Variables**
```bash
HOSTER_COMPLIANCE_RULES="No hate speech, harassment, or illegal content..."
COMPLIANCE_ENFORCEMENT_LEVEL="permissive"
COMPLIANCE_AI_MODEL="gpt-4o-mini"
COMPLIANCE_CONFIDENCE_THRESHOLD="0.7"
```

### **Database Queries Needed**
- Community settings fetching by ID
- Board settings fetching by ID and community
- User admin status checking (for fallback modes)

### **New Dependencies**
No new npm packages required - uses existing AI SDK and UI components.

---

## Testing Strategy

### **Unit Tests**
- ComplianceService methods
- Rule aggregation logic
- AI prompt generation
- Fallback mode handling

### **Integration Tests**
- End-to-end post creation flow
- Compliance violation blocking
- Style improvement acceptance
- Fallback mode scenarios

### **Manual Testing**
- UI/UX flow validation
- Error message clarity
- Performance under load
- Cross-browser compatibility

---

## Rollback Plan

### **Safe Rollback Points**
1. **After Step A1**: AI endpoint enhanced but not integrated
2. **After Step A2**: Pipeline integration can be disabled via feature flag
3. **After Step A3**: UI components can be hidden
4. **After Step A4**: Modal integration can revert to style-only mode

### **Feature Flags**
```typescript
// Add to environment or database
ENABLE_AI_COMPLIANCE_CHECKING=false  // Master switch
COMPLIANCE_FALLBACK_MODE="permissive"  // Safe fallback
```

---

## Success Criteria

### **Functional Requirements**
- ✅ Posts with compliance violations are blocked
- ✅ Clear violation explanations shown to users  
- ✅ Style improvements work alongside compliance
- ✅ Fallback modes handle AI service issues
- ✅ Admin override capabilities function

### **Performance Requirements**
- ✅ Compliance check completes within 3 seconds
- ✅ No increase in existing post creation latency
- ✅ Graceful degradation under high load

### **User Experience Requirements**
- ✅ Clear distinction between blocking vs optional changes
- ✅ Helpful guidance for fixing violations
- ✅ Smooth integration with existing workflow

---

## Risk Mitigation

### **High Risk: AI Service Unavailability**
- **Mitigation**: Robust fallback modes (strict/permissive/admin-only)
- **Monitoring**: AI service uptime alerts
- **Recovery**: Automatic retry with exponential backoff

### **Medium Risk: False Positives**
- **Mitigation**: Confidence thresholds and admin overrides
- **Monitoring**: User feedback on violation accuracy
- **Recovery**: Quick rule adjustment capability

### **Low Risk: Performance Impact**
- **Mitigation**: Async processing and caching
- **Monitoring**: Post creation latency metrics
- **Recovery**: Feature flag to disable if needed

---

This roadmap provides a comprehensive, step-by-step implementation plan that integrates AI compliance checking into your existing system while maintaining backward compatibility and providing robust fallback strategies. 