'use client';

import React, { useCallback } from 'react';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { ZoomIn, AlertCircle } from 'lucide-react';

// Types for image data and layout
export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  'data-image-id'?: string;
}

export interface ImageGroup {
  images: ImageAttributes[];
  layout: 'single' | 'row' | 'grid';
}

// Context for image modal communication
export interface ImageModalContext {
  openLightbox: (images: ImageAttributes[], initialIndex: number) => void;
}

// Global context for image modal (will be provided by components that use this extension)
let globalImageModalContext: ImageModalContext | null = null;

export const setImageModalContext = (context: ImageModalContext | null) => {
  globalImageModalContext = context;
};

// Enhanced Image Node View Component
const EnhancedImageNodeView: React.FC<ReactNodeViewProps> = ({ 
  node, 
  updateAttributes, 
  selected, 
  editor 
}) => {
  const { src, alt, title, width, height } = node.attrs as ImageAttributes;
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [naturalDimensions, setNaturalDimensions] = React.useState<{ width: number; height: number } | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // Get all images in the document to create image groups
  const getAllImages = useCallback((): ImageAttributes[] => {
    const images: ImageAttributes[] = [];
    
    if (editor?.state?.doc) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.state.doc.descendants((node: any) => {
        if (node.type.name === 'enhancedImage') {
          images.push(node.attrs as ImageAttributes);
        }
      });
    }
    
    return images;
  }, [editor]);

  // Handle image click to open lightbox
  const handleImageClick = useCallback(() => {
    if (!globalImageModalContext) return;
    
    const allImages = getAllImages();
    const currentIndex = allImages.findIndex(img => img.src === src);
    
    if (currentIndex !== -1) {
      globalImageModalContext.openLightbox(allImages, currentIndex);
    }
  }, [src, getAllImages]);

  // Handle image load
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIsLoading(false);
    setHasError(false);
    
    // Store natural dimensions for responsive calculations
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });

    // Update node attributes with natural dimensions if not set
    if (!width || !height) {
      updateAttributes({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  }, [width, height, updateAttributes]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Calculate responsive dimensions
  const getResponsiveDimensions = useCallback(() => {
    if (!naturalDimensions) return {};

    const { width: natWidth, height: natHeight } = naturalDimensions;
    const aspectRatio = natWidth / natHeight;

    // Mobile-first responsive sizing
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024;

    let maxWidth: number;
    
    if (isMobile) {
      maxWidth = Math.min(natWidth, 320); // Full width on mobile, max 320px
    } else if (isTablet) {
      maxWidth = Math.min(natWidth, 480); // Tablet sizing
    } else {
      maxWidth = Math.min(natWidth, 500); // Desktop max 500px
    }

    const calculatedHeight = maxWidth / aspectRatio;

    return {
      maxWidth: `${maxWidth}px`,
      height: `${calculatedHeight}px`,
      width: '100%'
    };
  }, [naturalDimensions]);

  // Loading placeholder
  if (isLoading && !hasError) {
    return (
      <NodeViewWrapper className="enhanced-image-wrapper">
        <div className="relative inline-block w-full max-w-md">
          <div className="aspect-video w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading image...</div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Error state
  if (hasError) {
    return (
      <NodeViewWrapper className="enhanced-image-wrapper">
        <div className="relative inline-block w-full max-w-md">
          <div className="aspect-video w-full border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">Failed to load image</div>
              <div className="text-xs text-muted-foreground/70 mt-1 break-all">{src}</div>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const responsiveDimensions = getResponsiveDimensions();

  return (
    <NodeViewWrapper className="enhanced-image-wrapper">
      <div 
        className={cn(
          "relative inline-block group cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:scale-[1.02]",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        style={responsiveDimensions}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleImageClick}
      >
        <img
          src={src}
          alt={alt || 'Image'}
          title={title}
          className={cn(
            "w-full h-auto rounded-lg shadow-sm object-cover",
            "transition-all duration-200"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        
        {/* Hover overlay with zoom hint */}
        {isHovered && globalImageModalContext && (
          <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center transition-opacity duration-200">
            <div className="bg-white/90 dark:bg-black/90 rounded-full p-2 shadow-lg">
              <ZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </div>
          </div>
        )}

        {/* Accessibility label */}
        <span className="sr-only">
          Click to enlarge image{alt ? `: ${alt}` : ''}
        </span>
      </div>
    </NodeViewWrapper>
  );
};

// Add command types
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedImage: {
      setEnhancedImage: (options: Partial<ImageAttributes>) => ReturnType;
    };
  }
}

// Enhanced Image Extension
export const EnhancedImageExtension = Image.extend({
  name: 'enhancedImage',

  addAttributes() {
    return {
      ...this.parent?.(),
      'data-image-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-image-id'),
        renderHTML: attributes => {
          if (!attributes['data-image-id']) {
            return {};
          }
          return {
            'data-image-id': attributes['data-image-id'],
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EnhancedImageNodeView);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEnhancedImage: (options: Partial<ImageAttributes>) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            ...options,
            'data-image-id': options['data-image-id'] || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          },
        });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-Alt-i': () => this.editor.chain().focus().setEnhancedImage({ src: '' }).run(),
    };
  },
});

// Utility function to detect image groups in content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const detectImageGroups = (doc: any): ImageGroup[] => {
  const groups: ImageGroup[] = [];
  const images: ImageAttributes[] = [];
  
  // Collect all images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.descendants((node: any) => {
    if (node.type.name === 'enhancedImage') {
      images.push(node.attrs as ImageAttributes);
    }
  });

  if (images.length === 0) return groups;

  // For now, treat all images as one group
  // Future enhancement: group consecutive images
  const layout = images.length === 1 ? 'single' : 
                 images.length <= 3 ? 'row' : 'grid';

  groups.push({ images, layout });

  return groups;
};

// CSS classes for responsive image layouts (to be added to globals.css)
export const imageLayoutStyles = `
/* Enhanced Image Layouts */
.enhanced-image-wrapper {
  display: inline-block;
  max-width: 100%;
}

/* Multiple image layouts */
.image-group-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}

.image-group-row .enhanced-image-wrapper {
  flex: 1;
  min-width: 200px;
  max-width: calc(50% - 0.25rem);
}

.image-group-grid {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  max-width: 600px;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .image-group-row {
    flex-direction: column;
  }
  
  .image-group-row .enhanced-image-wrapper,
  .image-group-grid .enhanced-image-wrapper {
    max-width: 100%;
  }
  
  .image-group-grid {
    grid-template-columns: 1fr;
  }
}

/* Container query support for future */
@container (max-width: 400px) {
  .enhanced-image-wrapper {
    width: 100% !important;
    max-width: 100% !important;
  }
}
`;