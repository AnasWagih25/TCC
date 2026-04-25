'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ProductImageSliderProps = {
  images: string[];
  alt: string;
};

export default function ProductImageSlider({ images, alt }: ProductImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const validImages = images ? images.filter(img => img && typeof img === 'string' && img.trim() !== '') : [];

  if (validImages.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {validImages.map((image, index) => (
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
          <img src={image.startsWith('data:') ? image : `/images/${image}`} alt={`${alt} - view ${index + 1}`} loading="lazy" />
        </div>
      ))}
      
      {validImages.length > 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', zIndex: 10, pointerEvents: 'none' }}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const isFirstSlide = currentIndex === 0;
              const newIndex = isFirstSlide ? validImages.length - 1 : currentIndex - 1;
              setCurrentIndex(newIndex);
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
              setCurrentIndex(newIndex);
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
