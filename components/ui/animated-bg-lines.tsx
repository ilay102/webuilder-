'use client';

import React from 'react';

/* ─────────────────────────────────────────────────────────────
   AnimatedBgLines
   A dramatic animated section backdrop:
   - Moving grid
   - Horizontal light beams
   - Corner bracket SVG animations

   Props:
   - accentColor   : hex color for lines/grid (default champagne gold)
   - gridOpacity   : grid brightness 0–1 (default 0.06)
   - speed         : animation multiplier — lower = slower (default 1)
   - children      : content rendered above the animation
───────────────────────────────────────────────────────────── */

const KEYFRAMES = `
@keyframes re-gridMove {
  0%   { background-position: 0 0; }
  100% { background-position: 50px 50px; }
}
@keyframes re-lineMove {
  0%   { transform: translateX(-110%); }
  100% { transform: translateX(110%); }
}
@keyframes re-cornerLine {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 400; }
}
`;

interface AnimatedBgLinesProps {
  children?: React.ReactNode;
  accentColor?: string;
  gridOpacity?: number;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedBgLines({
  children,
  accentColor = '#c4a96b',
  gridOpacity = 0.055,
  speed = 1,
  className = '',
  style = {},
}: AnimatedBgLinesProps) {

  // Convert hex → r,g,b for rgba usage
  const hex = accentColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;

  const lineDuration = 5 / speed;
  const gridDuration = 20 / speed;
  const cornerDuration = 7 / speed;

  const LINE_POSITIONS = ['10%', '28%', '50%', '72%', '90%'];

  return (
    <>
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>

        {/* ── Moving grid ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: [
            `linear-gradient(${rgba(gridOpacity)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${rgba(gridOpacity)} 1px, transparent 1px)`,
          ].join(','),
          backgroundSize: '50px 50px',
          animation: `re-gridMove ${gridDuration}s linear infinite`,
        }} />

        {/* ── Horizontal light beams ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
          {LINE_POSITIONS.map((top, i) => (
            <div key={i} style={{ position: 'absolute', width: '100%', top, height: 80 }}>
              <div style={{ width: '100%', height: 1, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute', top: 0, width: '100%', height: '100%',
                    background: `linear-gradient(90deg, transparent 0%, ${rgba(0.6)} 20%, ${rgba(1)} 50%, ${rgba(0.6)} 80%, transparent 100%)`,
                    animation: `re-lineMove ${lineDuration + i * 0.4}s linear infinite`,
                    animationDirection: i % 2 !== 0 ? 'reverse' : 'normal',
                    animationDelay: `${i * 0.8}s`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Corner bracket SVGs ── */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 320, height: 120, zIndex: 5,
        }}>
          {/* Left bracket */}
          <svg
            style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: -160, width: 130, height: 70,
              animation: `re-cornerLine ${cornerDuration}s linear infinite`,
            }}
            viewBox="0 0 130 70" stroke={accentColor} strokeWidth="1.5"
            fill="none" strokeDasharray="60" strokeLinecap="round"
          >
            <path d="M130 0 L20 0 Q0 0 0 20 L0 70" />
          </svg>
          {/* Right bracket (mirrored) */}
          <svg
            style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%) scaleX(-1)',
              right: -160, width: 130, height: 70,
              animation: `re-cornerLine ${cornerDuration}s linear infinite`,
              animationDelay: `${cornerDuration / 2}s`,
            }}
            viewBox="0 0 130 70" stroke={accentColor} strokeWidth="1.5"
            fill="none" strokeDasharray="60" strokeLinecap="round"
          >
            <path d="M130 0 L20 0 Q0 0 0 20 L0 70" />
          </svg>
        </div>

        {/* ── Content ── */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default AnimatedBgLines;
