'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight,
  Save,
  AlertTriangle
} from 'lucide-react';
import { LockCreationStepper } from './LockCreationStepper';
import { LockBuilderProvider, useLockBuilder } from './LockBuilderProvider';
import { LockBuilderStep, LockBuilderState } from '@/types/locks';
import { LockTemplateSelector } from './LockTemplateSelector';
import { LockTemplate } from '@/types/templates';

// Step content components
const MetadataStep = () => {
  const { state, setState } = useLockBuilder();
  
  const handleSelectTemplate = useCallback((template: LockTemplate) => {
    setState((prev: LockBuilderState) => ({
      ...prev,
      selectedTemplate: template,
      metadata: {
        ...prev.metadata,
        name: template.prefilledMetadata?.title || template.name,
        description: template.prefilledMetadata?.description || template.description,
        icon: template.prefilledMetadata?.icon || template.icon
      },
      requirements: template.prefilledRequirements || []
    }));
  }, [setState]);
  
  const handleStartFromScratch = useCallback(() => {
    setState((prev: LockBuilderState) => ({
      ...prev,
      selectedTemplate: null,
      metadata: {
        name: '',
        description: '',
        icon: '🔐'
      },
      requirements: []
    }));
  }, [setState]);
  
  return (
    <LockTemplateSelector
      onSelectTemplate={handleSelectTemplate}
      onStartFromScratch={handleStartFromScratch}
      selectedTemplate={state.selectedTemplate}
    />
  );
};

import { RequirementsList } from './RequirementsList';
import { RequirementTypePicker } from './RequirementTypePicker';
import { LyxBalanceConfigurator } from './configurators/LyxBalanceConfigurator';
import { EthBalanceConfigurator } from './configurators/EthBalanceConfigurator';
import { UPFollowerCountConfigurator } from './configurators/UPFollowerCountConfigurator';
import { RequirementType } from '@/types/locks';

const CategorySelectionStep = () => {
  const { state, addRequirement, updateRequirement, navigateBackToRequirements, navigateToRequirementConfig } = useLockBuilder();

  const handleSelectRequirementType = (requirementType: RequirementType) => {
    // Navigate to configuration screen for the selected type
    navigateToRequirementConfig(requirementType);
  };

  const handleBackToRequirements = () => {
    navigateBackToRequirements();
  };

  const handleSaveRequirement = (requirement: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (state.editingRequirementId) {
      // Update existing requirement
      updateRequirement(state.editingRequirementId, requirement);
    } else {
      // Add new requirement
      addRequirement(requirement);
    }
    // Navigate back to requirements list
    navigateBackToRequirements();
  };

  // Get the requirement being edited (if any)
  const editingRequirement = state.editingRequirementId 
    ? state.requirements.find((req: any) => req.id === state.editingRequirementId) // eslint-disable-line @typescript-eslint/no-explicit-any
    : undefined;

  // Render the appropriate screen based on currentScreen state
  switch (state.currentScreen) {
    case 'picker':
      return (
        <RequirementTypePicker
          onSelectType={handleSelectRequirementType}
          onBack={handleBackToRequirements}
        />
      );
    
    case 'configure':
      // Individual requirement configurators
      switch (state.selectedRequirementType) {
        case 'lyx_balance':
          return (
            <LyxBalanceConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'eth_balance':
          return (
            <EthBalanceConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'up_follower_count':
          return (
            <UPFollowerCountConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        default:
          // Placeholder for other requirement types
          return (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚧</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                The configurator for <strong>{state.selectedRequirementType}</strong> is not yet implemented.
              </p>
              <div className="mt-6">
                <Button onClick={handleBackToRequirements} variant="outline">
                  Back to Requirements
                </Button>
              </div>
            </div>
          );
      }
    
    case 'requirements':
    default:
      return <RequirementsList />;
  }
};

const ConfigurationStep = () => (
  <div className="text-center py-8">
    <div className="h-12 w-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center mb-4">
      <span className="text-2xl">⚙️</span>
    </div>
    <h3 className="text-lg font-semibold mb-2">Configure Requirements</h3>
    <p className="text-muted-foreground">Set up specific requirements for each category (Phase 3)</p>
  </div>
);

const PreviewStep = () => (
  <div className="text-center py-8">
    <div className="h-12 w-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center mb-4">
      <span className="text-2xl">👀</span>
    </div>
    <h3 className="text-lg font-semibold mb-2">Preview & Test</h3>
    <p className="text-muted-foreground">Test with real wallet connections (Phase 4)</p>
  </div>
);

const SaveStep = () => (
  <div className="text-center py-8">
    <div className="h-12 w-12 mx-auto bg-green-100 rounded-lg flex items-center justify-center mb-4">
      <span className="text-2xl">💾</span>
    </div>
    <h3 className="text-lg font-semibold mb-2">Save Lock</h3>
    <p className="text-muted-foreground">Review and save your lock configuration</p>
  </div>
);

// Step configuration
const STEP_CONFIG: Record<LockBuilderStep, {
  title: string;
  description: string;
  component: React.ComponentType;
  isRequired: boolean;
}> = {
  metadata: {
    title: 'Lock Details',
    description: 'Name, description, and visual identity',
    component: MetadataStep,
    isRequired: true
  },
  categories: {
    title: 'Requirements',
    description: 'Add and configure gating requirements',
    component: CategorySelectionStep,
    isRequired: true
  },
  configure: {
    title: 'Configure Requirements',
    description: 'Set up specific requirements for each category',
    component: ConfigurationStep,
    isRequired: true
  },
  preview: {
    title: 'Preview & Test',
    description: 'Test your lock with real wallet connections',
    component: PreviewStep,
    isRequired: false
  },
  save: {
    title: 'Save Lock',
    description: 'Review and save your lock configuration',
    component: SaveStep,
    isRequired: true
  }
};

const STEP_ORDER: LockBuilderStep[] = ['metadata', 'categories', 'configure', 'preview', 'save'];

interface LockCreationModalContentProps {
  onSave: () => void;
  onCancel: () => void;
}

const LockCreationModalContent: React.FC<LockCreationModalContentProps> = ({
  onSave,
  onCancel
}) => {
  const { state, setState } = useLockBuilder();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentStepIndex = STEP_ORDER.indexOf(state.step);
  const currentStepConfig = STEP_CONFIG[state.step];
  const CurrentStepComponent = currentStepConfig.component;

  // Navigation handlers
  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setState((prev: LockBuilderState) => ({ ...prev, step: STEP_ORDER[nextIndex] }));
    }
  }, [currentStepIndex, setState]);

  const handlePrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setState((prev: LockBuilderState) => ({ ...prev, step: STEP_ORDER[prevIndex] }));
    }
  }, [currentStepIndex, setState]);

  const handleStepClick = useCallback((step: LockBuilderStep) => {
    setState((prev: LockBuilderState) => ({ ...prev, step }));
  }, [setState]);

  // Check if we can navigate forward
  const canGoNext = currentStepIndex < STEP_ORDER.length - 1;
  const canGoPrevious = currentStepIndex > 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  // Check if current step is complete (placeholder logic for now)
  const isStepComplete = (step: LockBuilderStep): boolean => {
    // TODO: Implement real validation logic in later phases
    const completedSteps = STEP_ORDER.slice(0, currentStepIndex + 1);
    return completedSteps.includes(step);
  };

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // TODO: Implement actual save logic in later phases
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSave();
    } catch (error) {
      console.error('Failed to save lock:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Handle cancel with confirmation
  const handleCancel = useCallback(() => {
    // Check if user has made any changes (simplified for now)
    const hasChanges = currentStepIndex > 0;
    
    if (hasChanges) {
      setShowCancelDialog(true);
    } else {
      onCancel();
    }
  }, [currentStepIndex, onCancel]);

  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false);
    onCancel();
  }, [onCancel]);

  return (
    <>
      <DialogHeader className="flex-shrink-0 border-b pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="flex items-center text-xl">
              <span className="text-2xl mr-3">🔐</span>
              Create New Lock
              <Badge variant="secondary" className="ml-2 text-xs">
                Step {currentStepIndex + 1} of {STEP_ORDER.length}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {currentStepConfig.description}
            </DialogDescription>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mt-4">
          <LockCreationStepper
            steps={STEP_ORDER.map(step => ({
              key: step,
              title: STEP_CONFIG[step].title,
              isActive: step === state.step,
              isComplete: isStepComplete(step),
              isRequired: STEP_CONFIG[step].isRequired
            }))}
            onStepClick={handleStepClick}
          />
        </div>
      </DialogHeader>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6">
        <div className="container max-w-2xl mx-auto px-4">
          <CurrentStepComponent />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {canGoPrevious && (
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
            
            {isLastStep ? (
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center"
              >
                {isSaving ? (
                  <div className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Lock
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <Dialog open={true} onOpenChange={() => setShowCancelDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Discard Changes?
              </DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to discard them and close the lock creator?
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelDialog(false)}
              >
                Keep Editing
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmCancel}
              >
                Discard Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

interface LockCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (lockId: number) => void;
}

export const LockCreationModal: React.FC<LockCreationModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const handleSave = useCallback(() => {
    // TODO: Return actual lock ID from save operation
    const mockLockId = Date.now(); // Temporary mock ID
    onSave?.(mockLockId);
    onClose();
  }, [onSave, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <LockBuilderProvider>
          <LockCreationModalContent 
            onSave={handleSave}
            onCancel={onClose}
          />
        </LockBuilderProvider>
      </DialogContent>
    </Dialog>
  );
}; 