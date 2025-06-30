'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Editor } from '@tiptap/react';
import React, { useState } from 'react';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { MultiImageLayout } from '@/components/ui/MultiImageLayout';
import { ImageModal } from '@/components/ui/ImageModal';

// Types for our enhanced image data
interface EnhancedImageData {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface EnhancedImageGroupData {
  images: EnhancedImageData[];
  layout?: 'single' | 'grid';
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

// React component for rendering images in the editor
const EnhancedImageComponent: React.FC<NodeViewProps> = ({ node }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Extract data from node attributes
  const data: EnhancedImageGroupData = node.attrs.data || {
    images: [{ src: node.attrs.src, alt: node.attrs.alt }],
    layout: 'single',
    maxWidth: 'lg'
  };

  // Handle single image (backward compatibility)
  if (node.attrs.src && (!data.images || data.images.length === 0)) {
    data.images = [{
      src: node.attrs.src,
      alt: node.attrs.alt,
      caption: node.attrs.caption,
      width: node.attrs.width,
      height: node.attrs.height,
    }];
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Prepare images for modal
  const modalImages = data.images.map(img => ({
    src: img.src,
    alt: img.alt,
    caption: img.caption,
  }));

  return (
    <NodeViewWrapper className="enhanced-image-wrapper">
      {data.images.length === 1 ? (
        <ResponsiveImage
          src={data.images[0].src}
          alt={data.images[0].alt}
          caption={data.images[0].caption}
          onClick={() => handleImageClick(0)}
          maxWidth={data.maxWidth}
          lazy={false} // Don't lazy load in editor
        />
      ) : (
        <MultiImageLayout
          images={data.images}
          onImageClick={handleImageClick}
          maxWidth={data.maxWidth}
          lazy={false} // Don't lazy load in editor
        />
      )}

      {/* Image Modal */}
      <ImageModal
        images={modalImages}
        initialIndex={selectedImageIndex}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />
    </NodeViewWrapper>
  );
};

// TipTap Extension Definition
export const EnhancedImageExtension = Node.create({
  name: 'enhancedImage',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      // Backward compatibility with standard image attributes
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) return {};
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          if (!attributes.alt) return {};
          return { alt: attributes.alt };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) return {};
          return { title: attributes.title };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      // Enhanced attributes for our system
      data: {
        default: null,
        parseHTML: element => {
          const dataAttr = element.getAttribute('data-enhanced-images');
          if (dataAttr) {
            try {
              return JSON.parse(dataAttr);
            } catch {
              return null;
            }
          }
          return null;
        },
        renderHTML: attributes => {
          if (!attributes.data) return {};
          return { 'data-enhanced-images': JSON.stringify(attributes.data) };
        },
      },
      caption: {
        default: null,
        parseHTML: element => element.getAttribute('data-caption'),
        renderHTML: attributes => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
      maxWidth: {
        default: 'lg',
        parseHTML: element => element.getAttribute('data-max-width') || 'lg',
        renderHTML: attributes => {
          return { 'data-max-width': attributes.maxWidth || 'lg' };
        },
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: element => {
          if (typeof element === 'string') return false;
          
          const img = element as HTMLImageElement;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width'),
            height: img.getAttribute('height'),
            caption: img.getAttribute('data-caption'),
            maxWidth: img.getAttribute('data-max-width') || 'lg',
          };
        }
      },
      {
        tag: 'div[data-enhanced-images]',
        getAttrs: element => {
          if (typeof element === 'string') return false;
          
          const div = element as HTMLDivElement;
          const dataAttr = div.getAttribute('data-enhanced-images');
          if (dataAttr) {
            try {
              const data = JSON.parse(dataAttr);
              return { data };
            } catch {
              return false;
            }
          }
          return false;
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // If we have enhanced data, render as div
    if (HTMLAttributes.data) {
      return [
        'div', 
        mergeAttributes(HTMLAttributes, {
          class: 'enhanced-image-group',
          'data-enhanced-images': HTMLAttributes.data ? JSON.stringify(HTMLAttributes.data) : undefined
        })
      ];
    }
    
    // Otherwise render as standard img for backward compatibility
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EnhancedImageComponent);
  },

  // Commands will be added through utility functions to avoid complex typing
});

// Utility functions for working with the extension
export const insertSingleImage = (editor: Editor, src: string, alt?: string, caption?: string) => {
  if (!editor) return;
  
  editor.chain().focus().insertContent({
    type: 'enhancedImage',
    attrs: {
      src,
      alt,
      caption,
      maxWidth: 'lg',
    },
  }).run();
};

export const insertMultipleImages = (editor: Editor, images: EnhancedImageData[], maxWidth: 'sm' | 'md' | 'lg' | 'full' = 'lg') => {
  if (!editor || !images.length) return;
  
  editor.chain().focus().insertContent({
    type: 'enhancedImage',
    attrs: {
      data: {
        images,
        layout: images.length === 1 ? 'single' : 'grid',
        maxWidth,
      },
    },
  }).run();
};

export const replaceCurrentImage = (editor: Editor, newSrc: string, newAlt?: string, newCaption?: string) => {
  if (!editor) return;
  
  const { state } = editor;
  const { selection } = state;
  const node = state.doc.nodeAt(selection.from);
  
  if (node && node.type.name === 'enhancedImage') {
    editor.chain().focus().updateAttributes('enhancedImage', {
      src: newSrc,
      alt: newAlt,
      caption: newCaption,
    }).run();
  }
};