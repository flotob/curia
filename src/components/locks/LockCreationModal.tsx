'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  AlertTriangle,
  Eye
} from 'lucide-react';
import { LockCreationStepper } from './LockCreationStepper';
import { LockBuilderProvider, useLockBuilder } from './LockBuilderProvider';
import { LockBuilderStep, LockBuilderState } from '@/types/locks';
import { LockTemplateSelector } from './LockTemplateSelector';
import { LockTemplate } from '@/types/templates';
import { GatingRequirementsPreview } from './GatingRequirementsPreview';

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
import { ENSDomainConfigurator } from './configurators/ENSDomainConfigurator';
import { ENSPatternConfigurator } from './configurators/ENSPatternConfigurator';
import { EFPFollowerCountConfigurator } from './configurators/EFPFollowerCountConfigurator';
import { UPMustFollowConfigurator } from './configurators/UPMustFollowConfigurator';
import { UPMustBeFollowedByConfigurator } from './configurators/UPMustBeFollowedByConfigurator';
import { EFPMustFollowConfigurator } from './configurators/EFPMustFollowConfigurator';
import { EFPMustBeFollowedByConfigurator } from './configurators/EFPMustBeFollowedByConfigurator';
import { LSP7TokenConfigurator } from './configurators/LSP7TokenConfigurator';
import { LSP8NFTConfigurator } from './configurators/LSP8NFTConfigurator';
import { ERC20TokenConfigurator } from './configurators/ERC20TokenConfigurator';
import { ERC721NFTConfigurator } from './configurators/ERC721NFTConfigurator';
import { ERC1155TokenConfigurator } from './configurators/ERC1155TokenConfigurator';
import { RequirementType } from '@/types/locks';

const RequirementsStep = () => {
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
        
        case 'efp_follower_count':
          return (
            <EFPFollowerCountConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'ens_domain':
          return (
            <ENSDomainConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'ens_pattern':
          return (
            <ENSPatternConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'up_must_follow':
          return (
            <UPMustFollowConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'up_must_be_followed_by':
          return (
            <UPMustBeFollowedByConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'efp_must_follow':
          return (
            <EFPMustFollowConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'efp_must_be_followed_by':
          return (
            <EFPMustBeFollowedByConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'lsp7_token':
          return (
            <LSP7TokenConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'lsp8_nft':
          return (
            <LSP8NFTConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'erc20_token':
          return (
            <ERC20TokenConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'erc721_nft':
          return (
            <ERC721NFTConfigurator
              editingRequirement={editingRequirement}
              onSave={handleSaveRequirement}
              onCancel={handleBackToRequirements}
            />
          );
        
        case 'erc1155_token':
          return (
            <ERC1155TokenConfigurator
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



const PreviewStep = () => {
  const { state } = useLockBuilder();
  
  // Convert current builder state to a lock format for preview
  const previewLock = useMemo(() => {
    // Convert requirements to gating categories
    const categories = state.requirements.map((req: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // This is a simplified conversion - in a real implementation,
      // you'd need to properly convert GatingRequirement to GatingCategory
      return {
        type: req.category === 'social' ? 'universal_profile' : 'ethereum_profile',
        enabled: true,
        requirements: req // Simplified - would need proper conversion
      };
    });

    return {
      id: -1, // Preview mode indicator
      name: state.metadata.name || 'Untitled Lock',
      description: state.metadata.description || 'Preview of your lock configuration',
      icon: state.metadata.icon || '🔒',
      color: state.metadata.color || '#3b82f6',
      gatingConfig: {
        categories,
        requireAny: true // Default to OR logic for now
      },
      tags: state.metadata.tags || [],
      usageCount: 0,
      successRate: 1.0,
      avgVerificationTime: 120, // 2 minutes default
      isTemplate: false,
      isPublic: state.metadata.isPublic || false,
      isOwned: true,
      canEdit: true,
      canDelete: true,
      creatorUserId: 'preview-user',
      communityId: 'preview-community',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [state]);

  const requirementCount = state.requirements.length;

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{state.metadata.icon || '🔒'}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {state.metadata.name || 'Untitled Lock'}
              </h3>
              <p className="text-sm text-gray-600">
                {requirementCount} requirement{requirementCount !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Eye className="h-3 w-3 mr-1" />
            Preview Mode
          </Badge>
        </div>
        
        {state.metadata.description && (
          <p className="text-gray-700">{state.metadata.description}</p>
        )}
      </div>

      {/* Interactive Preview Explanation */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              Live Interactive Preview
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This is exactly how users will see and interact with your access control requirements. 
              You can connect your wallets below to test the verification flow!
            </p>
          </div>
        </div>
      </div>

      {/* Real Lock Preview - Same as users will see */}
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-1">
        <GatingRequirementsPreview 
          gatingConfig={previewLock.gatingConfig}
          className="border-0 shadow-none bg-background"
        />
      </div>

      {/* Template Info (if selected) */}
      {state.selectedTemplate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-lg mr-2">{state.selectedTemplate.icon}</span>
            <h4 className="font-medium text-gray-900">Based on Template</h4>
          </div>
          <p className="text-sm text-gray-600 mb-2">{state.selectedTemplate.name}</p>
          <p className="text-xs text-gray-500">{state.selectedTemplate.description}</p>
        </div>
      )}

      {/* Ready Confirmation */}
      {requirementCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-xl mr-3">✅</span>
            <div>
              <h4 className="font-medium text-green-900 mb-1">Lock Ready!</h4>
              <p className="text-sm text-green-800">
                Your access control configuration looks perfect. Click &quot;Next&quot; to finalize the lock details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SaveStep = () => {
  const { state, setState } = useLockBuilder();
  const [lockName, setLockName] = useState(state.metadata.name || '');
  const [lockDescription, setLockDescription] = useState(state.metadata.description || '');
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setLockName(name);
    setState((prev: LockBuilderState) => ({
      ...prev,
      metadata: { ...prev.metadata, name }
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value;
    setLockDescription(description);
    setState((prev: LockBuilderState) => ({
      ...prev,
      metadata: { ...prev.metadata, description }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Final Configuration Review */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">✨</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lock Ready to Save</h3>
            <p className="text-sm text-gray-600">
              Add final details and save your lock for reuse
            </p>
          </div>
        </div>
      </div>

      {/* Lock Details Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="lock-name" className="block text-sm font-medium text-gray-700 mb-2">
            Lock Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lock-name"
            type="text"
            value={lockName}
            onChange={handleNameChange}
            placeholder="Enter a name for this lock..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            This name will help you identify the lock when applying it to posts
          </p>
        </div>

        <div>
          <label htmlFor="lock-description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="lock-description"
            value={lockDescription}
            onChange={handleDescriptionChange}
            placeholder="Describe what this lock is for..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional description to explain the purpose of this lock
          </p>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Requirements:</span>
            <span className="ml-2 font-medium text-gray-900">
              {state.requirements.length} configured
            </span>
          </div>
          <div>
            <span className="text-gray-600">Template:</span>
            <span className="ml-2 font-medium text-gray-900">
              {state.selectedTemplate?.name || 'Custom'}
            </span>
          </div>
        </div>
        
        {state.requirements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-gray-600 text-sm">Requirements:</span>
            <div className="mt-1 space-y-1">
              {state.requirements.map((req: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={index} className="text-xs text-gray-700 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                  {req.description || `${req.type} requirement`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-xl mr-3">📋</span>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">After Saving</h4>
            <p className="text-sm text-blue-800">
              Your lock will be saved and available for use when creating gated posts. 
              You can apply it to control who can view or respond to your content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step configuration
const STEP_CONFIG: Record<LockBuilderStep, {
  title: string;
  description: string;
  component: React.ComponentType;
  isRequired: boolean;
}> = {
  metadata: {
    title: 'Template & Info',
    description: 'Choose a template and add basic details',
    component: MetadataStep,
    isRequired: true
  },
  requirements: {
    title: 'Requirements',
    description: 'Add and configure gating requirements',
    component: RequirementsStep,
    isRequired: true
  },
  preview: {
    title: 'Preview & Test',
    description: 'Test your lock with wallet connections',
    component: PreviewStep,
    isRequired: false
  },
  save: {
    title: 'Lock Details',
    description: 'Name, description and final settings',
    component: SaveStep,
    isRequired: true
  }
};

const STEP_ORDER: LockBuilderStep[] = ['metadata', 'requirements', 'preview', 'save'];

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