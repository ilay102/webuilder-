'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

// Bypass Next.js static bundler analysis — load as true browser ES module
const dynamicImport = new Function('url', 'return import(url)');
const CDN = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

const randomColors = (n: number) =>
  Array.from({ length: n }, () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

export function TubesBackground({ children, className, enableClickInteraction = true }: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tubesRef  = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    dynamicImport(CDN)
      .then((mod: any) => {
        if (!mounted || !canvasRef.current) return;
        const TubesCursor = mod.default;
        if (typeof TubesCursor !== 'function') return;
        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ['#f967fb', '#53bc28', '#6958d5'],
            lights: { intensity: 200, colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5'] },
          },
        });
        tubesRef.current = app;
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    tubesRef.current.tubes.setColors(randomColors(3));
    tubesRef.current.tubes.setLightsColors(randomColors(4));
  };

  return (
    <div className={cn('relative w-full overflow-hidden bg-black', className)} onClick={handleClick}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" style={{ touchAction: 'none' }} />
      <div className="relative z-10 w-full h-full pointer-events-none">{children}</div>
    </div>
  );
}

export default TubesBackground;
