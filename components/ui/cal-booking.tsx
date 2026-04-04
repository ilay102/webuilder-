'use client';

import { useEffect } from 'react';

declare global {
  interface Window { Cal?: any; }
}

interface CalBookingProps {
  calLink: string;
  brandColor?: string;
  children: React.ReactNode;
  className?: string;
}

function loadCal(calLink: string, brandColor: string) {
  const namespace = calLink.replace(/[^a-zA-Z0-9]/g, '_');

  // Cal.com's official IIFE — sets up window.Cal as a queue
  (function (C: any, A: string, L: string) {
    const p = (a: any, ar: any) => a.q.push(ar);
    const d = document;
    C.Cal = C.Cal || function (...args: any[]) {
      const cal = C.Cal;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        const s = d.createElement('script');
        s.src = A;
        s.async = true;
        d.head.appendChild(s);
        cal.loaded = true;
      }
      if (args[0] === L) {
        const api: any = (...a: any[]) => p(api, a);
        const ns = args[1];
        api.q = api.q || [];
        if (typeof ns === 'string') {
          cal.ns[ns] = cal.ns[ns] || api;
          p(cal.ns[ns], args);
          p(cal, [L, ns, args[2]]);
        } else {
          p(cal, args);
        }
        return;
      }
      p(cal, args);
    };
  })(window, 'https://app.cal.com/embed/embed.js', 'init');

  window.Cal('init', namespace, { origin: 'https://app.cal.com' });
  window.Cal.ns[namespace]('ui', {
    styles: { branding: { brandColor } },
    hideEventTypeDetails: false,
    layout: 'month_view',
  });
}

export function CalBooking({ calLink, brandColor = '#000000', children, className }: CalBookingProps) {
  const namespace = calLink.replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    loadCal(calLink, brandColor);
  }, [calLink, brandColor]);

  return (
    <span
      className={className}
      style={{ display: 'inline-block', cursor: 'pointer' }}
      data-cal-link={calLink}
      data-cal-namespace={namespace}
      data-cal-config={JSON.stringify({ layout: 'month_view' })}
    >
      {children}
    </span>
  );
}

export function CalFloatingButton({
  calLink,
  brandColor = '#000000',
  label = 'Book a Meeting',
  buttonStyle = {},
}: {
  calLink: string;
  brandColor?: string;
  label?: string;
  buttonStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 999 }}>
      <CalBooking calLink={calLink} brandColor={brandColor}>
        <button style={{
          background: brandColor,
          color: '#fff',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          padding: '14px 28px',
          borderRadius: 99,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          letterSpacing: '0.04em',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          ...buttonStyle,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.30)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {label}
        </button>
      </CalBooking>
    </div>
  );
}
