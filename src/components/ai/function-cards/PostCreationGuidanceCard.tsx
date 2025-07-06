import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { TypedFunctionCardProps, PostCreationGuidanceData } from '../types/FunctionCardProps';

export function PostCreationGuidanceCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<PostCreationGuidanceData>) {
  const handleOpenPostCreator = () => {
    onAction?.('openPostCreator', { 
      autoExpand: true,
      initialQuery: 'Share your thoughts or ask a question',
      initialTitle: 'Share your thoughts or ask a question'
    });
  };

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-md border border-blue-200/60 dark:border-blue-800/60">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
          <PlusCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">
            Creating a New Post
          </h4>
          
          <p className="text-xs text-blue-700 dark:text-blue-200 mb-3 leading-relaxed">
            {data.explanation}
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={handleOpenPostCreator}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full justify-center"
              size="sm"
            >
              <PlusCircle className="w-3 h-3" />
              {data.buttonText}
            </Button>
            
            <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <span>Search</span>
              <ArrowRight className="w-2 h-2" />
              <span>Review</span>
              <ArrowRight className="w-2 h-2" />
              <span>Create</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 