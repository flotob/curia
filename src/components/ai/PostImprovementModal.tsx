'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { hasMeaningfulChanges } from '@/utils/diffUtils';
import { authFetch } from '@/utils/authFetch';

interface PostImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  originalTitle?: string;
  contentType: 'post' | 'comment';
  onSubmitOriginal: () => void;
  onSubmitImproved: (improvedContent: string) => void;
}

interface ImprovementResponse {
  improvedContent: string;
  summary: string;
  confidence: number;
  changes?: Array<{
    type: string;
    reason: string;
  }>;
}

export function PostImprovementModal({
  isOpen,
  onClose,
  originalContent,
  originalTitle,
  contentType,
  onSubmitOriginal,
  onSubmitImproved
}: PostImprovementModalProps) {
  const [improvedContent, setImprovedContent] = useState<string>('');
  const [improvementSummary, setImprovementSummary] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [requestAbortController, setRequestAbortController] = useState<AbortController | null>(null);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const hasStartedImprovement = useRef(false);

  const improveContent = async () => {
    if (!originalContent.trim()) {
      setError('No content to improve');
      return;
    }

    console.log('[AI Improvement] Starting improvement process...');
    
    // Cancel any existing request
    if (requestAbortController) {
      requestAbortController.abort();
    }
    
    const abortController = new AbortController();
    setRequestAbortController(abortController);
    setIsImproving(true);
    setError('');
    
    // Add timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
      setError('Request timeout - AI service took too long to respond');
      setIsImproving(false);
    }, 60000); // 60 second timeout
    
    try {
      const response = await authFetch('/api/ai/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: originalContent,
          type: contentType,
          title: originalTitle
        }),
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve content');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let finalResult: ImprovementResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().length === 0) continue; // Skip empty lines
          
          console.log('[AI Streaming] Processing line:', line.substring(0, 100) + (line.length > 100 ? '...' : ''));
          
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[AI Streaming] Parsed data format:', data);
              
              // Look for tool result data (v4 format)
              if (data.type === 'tool-result' && data.result?.success && data.result?.data) {
                console.log('[AI Streaming] Found tool result in data format!');
                finalResult = {
                  improvedContent: data.result.data.improvedContent,
                  summary: data.result.data.summary,
                  confidence: data.result.data.confidence,
                  changes: data.result.data.changes
                };
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse streaming data:', parseError);
            }
          } else if (line.trim().startsWith('a:')) {
            // Handle AI SDK v4 tool result format
            try {
              const data = JSON.parse(line.slice(2));
              console.log('[AI Streaming] Parsed AI SDK format:', data);
              
              // Look for tool execution result
              if (data.result?.success && data.result?.data) {
                console.log('[AI Streaming] Found tool result in AI SDK format!');
                finalResult = {
                  improvedContent: data.result.data.improvedContent,
                  summary: data.result.data.summary,
                  confidence: data.result.data.confidence,
                  changes: data.result.data.changes
                };
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse AI SDK streaming data:', parseError);
            }
          }
        }
      }

      console.log('[AI Streaming] Final result:', finalResult);
      
      if (!finalResult) {
        throw new Error('No improvement result received');
      }

      // Set the results
      setImprovedContent(finalResult.improvedContent);
      setImprovementSummary(finalResult.summary);
      setConfidence(finalResult.confidence);
      
      // Check if there are meaningful changes
      const meaningful = hasMeaningfulChanges(originalContent, finalResult.improvedContent);
      setHasChanges(meaningful);

      if (!meaningful) {
        // Content is already great - auto-submit after brief success message
        setIsAutoSubmitting(true);
        setTimeout(() => {
          onSubmitOriginal();
        }, 1500); // Give user time to see the positive feedback
      }

    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Content improvement error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request was cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to improve content');
      }
    } finally {
      setIsImproving(false);
      setRequestAbortController(null);
    }
  };

  // Start improvement when modal opens (prevent double-firing in dev mode)
  useEffect(() => {
    if (isOpen && originalContent && !improvedContent && !isImproving && !hasStartedImprovement.current) {
      hasStartedImprovement.current = true;
      improveContent();
    }
  }, [isOpen, originalContent]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Cancel any pending request
      if (requestAbortController) {
        requestAbortController.abort();
        setRequestAbortController(null);
      }
      
      setImprovedContent('');
      setImprovementSummary('');
      setConfidence(0);
      setError('');
      setHasChanges(false);
      setIsImproving(false);
      setIsAutoSubmitting(false);
      hasStartedImprovement.current = false; // Reset ref for next time
    }
  }, [isOpen, requestAbortController]);

  const handleUseImproved = () => {
    if (improvedContent) {
      onSubmitImproved(improvedContent);
    }
  };

  const handleEditImproved = (editedContent: string) => {
    setImprovedContent(editedContent);
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-600';
    if (conf >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return 'High';
    if (conf >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Content Improvement
          </DialogTitle>
          <DialogDescription>
            Review the AI suggestions and choose how to proceed with your {contentType}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isImproving ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="text-center">
                <h3 className="font-semibold mb-2">Analyzing and improving your content...</h3>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds while our AI reviews your content for improvements.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <Alert className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={improveContent} disabled={isImproving}>
                  Try Again
                </Button>
                <Button onClick={onSubmitOriginal}>
                  Post Original
                </Button>
              </div>
            </div>
          ) : improvedContent && hasChanges ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Improvement Summary */}
              {improvementSummary && (
                <div className="flex-shrink-0 p-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Improvements Made</span>
                      <Badge variant="outline" className={getConfidenceColor(confidence)}>
                        {getConfidenceLabel(confidence)} Confidence ({confidence}%)
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {improvementSummary}
                  </p>
                </div>
              )}

              {/* Diff Viewer */}
              <div className="flex-1 overflow-hidden">
                <DiffViewer
                  original={originalContent}
                  improved={improvedContent}
                  onAccept={handleUseImproved}
                  onReject={onSubmitOriginal}
                  onEdit={handleEditImproved}
                  onCancel={onClose}
                />
              </div>
            </div>
          ) : isAutoSubmitting ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">Content looks great!</h3>
                <p className="text-sm text-muted-foreground">
                  Your content is already well-written. Posting now...
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer removed - action buttons are now in DiffViewer */}
      </DialogContent>
    </Dialog>
  );
} 