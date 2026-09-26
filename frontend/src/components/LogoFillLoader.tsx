import React, { useEffect, useState } from 'react';

interface LogoFillLoaderProps {
  isDataReady?: boolean;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const LogoFillLoader: React.FC<LogoFillLoaderProps> = ({
  isDataReady = true,
  onFinish,
  minDurationMs = 880,
}) => {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let rafId: number;
    const startTime = performance.now();
    let isTerminated = false;

    const loop = (currentTime: number) => {
      if (isTerminated) return;

      const elapsed = currentTime - startTime;
      const linearRatio = Math.min(1, elapsed / minDurationMs);

      // Smooth continuous linear progress calculation
      const currentP = Math.min(100, Math.round(linearRatio * 100));
      setProgress(currentP);

      // When animation reaches 100% and data is ready:
      if (linearRatio >= 1) {
        if (isDataReady) {
          isTerminated = true;
          setIsDone(true);
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 200);
          return;
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isDataReady, minDurationMs, onFinish]);

  return (
    <div
      className={`logo-loader-overlay ${isFadingOut ? 'fade-out' : ''}`}
      role="status"
      aria-label="Loading StudySync AI"
    >
      <div
        className={`loader-seq-stage ${isDone ? 'is-complete' : ''}`}
        style={{
          width: '220px',
          height: '240px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Logo Container with Dual-Layer Progressive Reveal */}
        <div
          style={{
            position: 'relative',
            width: '160px',
            height: '148px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Subtle Ambient Glow behind logo */}
          <div
            style={{
              position: 'absolute',
              inset: '-20px',
              background: 'radial-gradient(circle, rgba(79, 70, 229, 0.16) 0%, rgba(79, 70, 229, 0) 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              opacity: 0.2 + (progress / 100) * 0.8,
              transition: 'opacity 0.1s ease',
            }}
          />

          {/* 1. Base Layer: Monochrome Blueprint Outline */}
          <img
            src="/studysync-logo-transparent.png"
            alt="StudySync AI"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'grayscale(100%) opacity(0.20)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* 2. Top Layer: 100% Authentic Vibrant 2K Colors Flowing Upwards */}
          <img
            src="/studysync-logo-transparent.png"
            alt="StudySync AI"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              clipPath: `inset(${100 - progress}% 0 0 0)`,
              filter: 'drop-shadow(0 4px 14px rgba(79, 70, 229, 0.25))',
              userSelect: 'none',
              pointerEvents: 'none',
              transition: 'clip-path 0.04s linear',
            }}
          />

          {/* Horizontal glowing scanner beam at the progress boundary */}
          {progress > 2 && progress < 98 && (
            <div
              style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                top: `${100 - progress}%`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #818CF8, #FFFFFF, #818CF8, transparent)',
                boxShadow: '0 0 8px 2px rgba(99, 102, 241, 0.7)',
                pointerEvents: 'none',
                transform: 'translateY(-50%)',
              }}
            />
          )}
        </div>

        {/* Modern Minimalist Progress Indicator */}
        <div
          style={{
            marginTop: '22px',
            width: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Micro Progress Bar Track */}
          <div
            style={{
              width: '100%',
              height: '3px',
              borderRadius: '9999px',
              backgroundColor: '#E2E8F0',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4F46E5, #818CF8)',
                borderRadius: '9999px',
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          {/* Academic OS Loading Label */}
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#64748B',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Workspace</span>
            <span style={{ color: '#4F46E5', fontWeight: 700 }}>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoFillLoader;
