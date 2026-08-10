'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';

type ProductImageSliderProps = {
  images: string[];
  alt: string;
};

export default function ProductImageSlider({ images, alt }: ProductImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedIndices, setLoadedIndices] = useState<Record<number, boolean>>({ 0: true });

  const handleIndexChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    setLoadedIndices(prev => ({ ...prev, [newIndex]: true }));
  };

  const validImages = images ? images.filter(img => img && typeof img === 'string' && img.trim() !== '') : [];

  if (validImages.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {validImages.map((image, index) => {
        // Only render DOM element if active or previously visited
        if (!loadedIndices[index] && index !== currentIndex) return null;

        return (
          <div 
            key={index} 
            style={{ 
              opacity: index === currentIndex ? 1 : 0, 
              transition: 'opacity 0.3s ease-in-out',
              position: index === 0 ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: index === currentIndex ? 1 : 0
            }}
          >
            <OptimizedImage
              src={image}
              alt={`${alt} - view ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        );
      })}
      
      {validImages.length > 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', zIndex: 10, pointerEvents: 'none' }}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const isFirstSlide = currentIndex === 0;
              const newIndex = isFirstSlide ? validImages.length - 1 : currentIndex - 1;
              handleIndexChange(newIndex);
            }}
            style={{ 
              background: 'rgba(255, 255, 255, 0.8)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--brown)',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const isLastSlide = currentIndex === validImages.length - 1;
              const newIndex = isLastSlide ? 0 : currentIndex + 1;
              handleIndexChange(newIndex);
            }}
            style={{ 
              background: 'rgba(255, 255, 255, 0.8)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--brown)',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      
      {validImages.length > 1 && (
        <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 10 }}>
          {validImages.map((_, index) => (
            <div 
              key={index} 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: index === currentIndex ? 'var(--brown)' : 'rgba(99, 61, 45, 0.3)',
                transition: 'background 0.2s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
