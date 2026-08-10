'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { resolveImageUrl } from '@/context/CartContext';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  loading?: 'lazy' | 'eager';
  onClick?: (e: React.MouseEvent) => void;
}

export default function OptimizedImage({
  src,
  alt,
  className,
  style,
  fill = false,
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  loading,
  onClick,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const resolved = resolveImageUrl(src);

  // If data URI or blob, use native img tag
  if (!resolved || resolved.startsWith('data:') || resolved.startsWith('blob:')) {
    return (
      <img
        src={resolved || '/images/preview.png'}
        alt={alt}
        className={className}
        style={{
          objectFit,
          ...style,
        }}
        loading={loading || (priority ? 'eager' : 'lazy')}
        onClick={onClick}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={className}
        style={{
          objectFit,
          transition: 'opacity 0.25s ease-in-out',
          opacity: loaded ? 1 : 0.8,
          ...style,
        }}
        onLoad={() => setLoaded(true)}
        onClick={onClick}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      width={width || 400}
      height={height || 400}
      priority={priority}
      sizes={sizes}
      className={className}
      style={{
        objectFit,
        transition: 'opacity 0.25s ease-in-out',
        opacity: loaded ? 1 : 0.8,
        ...style,
      }}
      onLoad={() => setLoaded(true)}
      onClick={onClick}
    />
  );
}
