'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';
import { 
  ImageAttributes, 
  ImageModalContext, 
  setImageModalContext 
} from '@/components/tiptap/EnhancedImageExtension';

interface ImageModalProviderProps {
  children: React.ReactNode;
}

export const ImageModalProvider: React.FC<ImageModalProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<ImageAttributes[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  // Create the modal context
  const openLightbox = useCallback((images: ImageAttributes[], index: number) => {
    setModalImages(images);
    setInitialIndex(index);
    setIsModalOpen(true);
  }, []);

  const modalContext: ImageModalContext = {
    openLightbox
  };

  // Set the global context when this component mounts
  useEffect(() => {
    setImageModalContext(modalContext);
    
    // Cleanup when component unmounts
    return () => {
      setImageModalContext(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Keep images and index for potential reopening during the session
  }, []);

  return (
    <>
      {children}
      
      <ImageLightboxModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        images={modalImages}
        initialIndex={initialIndex}
      />
    </>
  );
};