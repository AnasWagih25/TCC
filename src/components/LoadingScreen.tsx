'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    // Only show loading screen once per session if preferred, or every time.
    // For a fast cute intro, 1.8 seconds is perfect.
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Remove from DOM after fade out
      setTimeout(() => setIsRendered(false), 500);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!isRendered) return null;

  return (
    <div 
      className="polka-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div style={{
        animation: 'introBounce 1.5s cubic-bezier(0.28, 0.84, 0.42, 1) infinite alternate',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ width: '140px', height: '140px', position: 'relative', marginBottom: '24px' }}>
          <Image src="/images/logo-new.png" alt="Loading..." fill style={{ objectFit: 'contain' }} unoptimized />
        </div>
        <h1 
          style={{ 
            fontFamily: "'Ahsing', sans-serif", 
            color: 'var(--brown)',
            fontSize: '3.5rem',
            textAlign: 'center',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}
        >
          LOVE AT<br/>
          <span style={{ color: 'var(--brown)' }}>FIRST</span><br/>
          BITE
        </h1>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes introBounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-15px) scale(1.05); }
        }
      `}} />
    </div>
  );
}
