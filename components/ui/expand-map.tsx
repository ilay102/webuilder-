'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LocationMapProps {
  location?: string;
  coordinates?: string;
  className?: string;
}

export function LocationMap({
  location = 'Tel Aviv, Israel',
  coordinates = '32.0853° N, 34.7818° E',
  className,
}: LocationMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (expanded || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 8, y: dx * 8 });
  }, [expanded]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={cn('relative cursor-pointer select-none', className)}
      animate={{
        width: expanded ? 360 : 240,
        height: expanded ? 280 : 140,
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      onClick={() => setExpanded(v => !v)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card surface */}
      <div
        className="absolute inset-0 overflow-hidden rounded-lg"
        style={{
          background: 'rgba(19,19,19,0.85)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 8px 40px rgba(201,168,76,0.07)',
        }}
      >
        {/* SVG Street Map */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 360 280"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dark map background */}
          <rect width="360" height="280" fill="#0e0e0e" />

          {/* City blocks */}
          <rect x="20" y="20" width="60" height="40" fill="#161616" rx="2" />
          <rect x="100" y="20" width="80" height="55" fill="#161616" rx="2" />
          <rect x="200" y="20" width="50" height="35" fill="#161616" rx="2" />
          <rect x="270" y="20" width="70" height="50" fill="#161616" rx="2" />

          <rect x="20" y="90" width="45" height="60" fill="#161616" rx="2" />
          <rect x="85" y="100" width="55" height="45" fill="#161616" rx="2" />
          <rect x="160" y="90" width="70" height="55" fill="#161616" rx="2" />
          <rect x="250" y="95" width="90" height="40" fill="#161616" rx="2" />

          <rect x="20" y="180" width="80" height="50" fill="#161616" rx="2" />
          <rect x="120" y="185" width="60" height="45" fill="#161616" rx="2" />
          <rect x="200" y="175" width="75" height="60" fill="#161616" rx="2" />
          <rect x="295" y="185" width="45" height="40" fill="#161616" rx="2" />

          {/* Animated road lines */}
          <motion.line
            x1="0" y1="80" x2="360" y2="80"
            stroke="rgba(201,168,76,0.25)" strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.2 }}
          />
          <motion.line
            x1="0" y1="170" x2="360" y2="170"
            stroke="rgba(201,168,76,0.2)" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.4 }}
          />
          <motion.line
            x1="140" y1="0" x2="140" y2="280"
            stroke="rgba(201,168,76,0.2)" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.6 }}
          />
          <motion.line
            x1="240" y1="0" x2="240" y2="280"
            stroke="rgba(201,168,76,0.15)" strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.7 }}
          />
          <motion.line
            x1="60" y1="0" x2="60" y2="280"
            stroke="rgba(201,168,76,0.12)" strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.8 }}
          />

          {/* Diagonal avenue */}
          <motion.line
            x1="0" y1="260" x2="360" y2="60"
            stroke="rgba(201,168,76,0.12)" strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, ease: 'easeInOut', delay: 1 }}
          />

          {/* Location pin */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 1.2, stiffness: 300 }}
            style={{ transformOrigin: '180px 125px' }}
          >
            {/* Pin glow */}
            <motion.circle
              cx="180" cy="125" r="20"
              fill="rgba(201,168,76,0.08)"
              animate={{ r: [18, 26, 18] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Pin body */}
            <circle cx="180" cy="120" r="10" fill="#c9a84c" />
            <circle cx="180" cy="120" r="5" fill="#0e0e0e" />
            {/* Pin tail */}
            <motion.line
              x1="180" y1="130" x2="180" y2="138"
              stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"
            />
          </motion.g>
        </svg>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 60%, transparent)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-semibold tracking-wide" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {location}
              </p>
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs mt-0.5"
                    style={{ color: '#c9a84c', fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {coordinates}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {/* Live badge */}
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#c9a84c' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span className="text-xs uppercase tracking-widest" style={{ color: '#c9a84c', fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px' }}>
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Expand hint */}
        <AnimatePresence>
          {!expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2h3v3M5 12H2V9M13 2L8.5 6.5M2 12L6.5 7.5" stroke="rgba(201,168,76,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default LocationMap;
