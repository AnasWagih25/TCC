'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
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
        <div style={{ 
          width: '140px', 
          height: '140px', 
          position: 'relative', 
          marginBottom: '24px',
          filter: 'brightness(0) invert(1) drop-shadow(0 6px 16px rgba(243, 195, 206, 0.4))' 
        }}>
          <Image src="/images/logo-new.png" alt="Loading..." fill style={{ objectFit: 'contain' }} unoptimized />
        </div>
        <h1 
          style={{ 
            fontFamily: "'Ahsing', sans-serif", 
            color: '#FFFFFF',
            fontSize: '3.5rem',
            textAlign: 'center',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'
          }}
        >
          LOVE AT<br/>
          <span style={{ color: 'var(--pink)' }}>FIRST</span><br/>
          BITE
        </h1>
        <p style={{ color: 'var(--pink-light)', fontSize: '0.88rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: '16px', fontWeight: 600, opacity: 0.9 }}>
          Baking Fresh Batches...
        </p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes introBounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-12px) scale(1.04); }
        }
      `}} />
    </div>
  );
}
